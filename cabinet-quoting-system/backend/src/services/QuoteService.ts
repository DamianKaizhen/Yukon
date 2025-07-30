import {
  Quote,
  QuoteItem,
  QuoteStatus,
  Customer,
  ValidationError,
  NotFoundError,
  ConflictError,
  SearchParams
} from '@/types';
import database from '@/config/database';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';
import { ProductService } from './ProductService';

export class QuoteService {
  private readonly tableName = 'quotes';
  private readonly itemsTableName = 'quote_items';
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Create a new quote
   */
  public async create(quoteData: {
    customer_id: string;
    valid_until?: Date;
    notes?: string;
    created_by: string;
    items: {
      product_variant_id: string;
      box_material_id: string;
      quantity: number;
      discount_percent?: number;
      notes?: string;
    }[];
  }): Promise<Quote> {
    try {
      // Validate required fields
      Validator.validateRequiredFields(quoteData, ['customer_id', 'created_by', 'items']);
      Validator.validateUUIDFormat(quoteData.customer_id, 'Customer ID');
      Validator.validateUUIDFormat(quoteData.created_by, 'Created by user ID');
      
      if (!quoteData.items || quoteData.items.length === 0) {
        throw new ValidationError('Quote must have at least one item');
      }
      
      // Validate items
      for (const item of quoteData.items) {
        Validator.validateUUIDFormat(item.product_variant_id, 'Product variant ID');
        Validator.validateUUIDFormat(item.box_material_id, 'Box material ID');
        Validator.validatePositiveNumber(item.quantity, 'Quantity');
        
        if (item.discount_percent !== undefined) {
          if (item.discount_percent < 0 || item.discount_percent > 100) {
            throw new ValidationError('Discount percent must be between 0 and 100');
          }
        }
      }
      
      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber();
      
      // Set default valid until date (30 days from now)
      const validUntil = quoteData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      return await database.transaction(async (client) => {
        // Create quote header
        const quoteQuery = `
          INSERT INTO ${this.tableName} (
            quote_number, customer_id, status, subtotal, tax_amount, 
            discount_amount, total_amount, valid_until, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
        
        const quoteValues = [
          quoteNumber,
          quoteData.customer_id,
          QuoteStatus.DRAFT,
          0, // Will be calculated after items are added
          0,
          0,
          0,
          validUntil,
          quoteData.notes || null,
          quoteData.created_by
        ];
        
        const quoteResult = await client.query(quoteQuery, quoteValues);
        const quote = quoteResult.rows[0];
        
        // Add quote items
        let subtotal = 0;
        let totalDiscountAmount = 0;
        
        for (let i = 0; i < quoteData.items.length; i++) {
          const item = quoteData.items[i];
          
          // Get current price
          const price = await this.productService.getPrice(
            item.product_variant_id,
            item.box_material_id
          );
          
          if (price === null) {
            throw new ValidationError(`Price not found for product variant ${item.product_variant_id} with material ${item.box_material_id}`);
          }
          
          const unitPrice = price;
          const lineTotal = unitPrice * item.quantity;
          const discountAmount = item.discount_percent ? (lineTotal * item.discount_percent / 100) : 0;
          const lineTotalAfterDiscount = lineTotal - discountAmount;
          
          const itemQuery = `
            INSERT INTO ${this.itemsTableName} (
              quote_id, product_variant_id, box_material_id, quantity,
              unit_price, line_total, discount_percent, discount_amount,
              notes, line_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;
          
          const itemValues = [
            quote.id,
            item.product_variant_id,
            item.box_material_id,
            item.quantity,
            unitPrice,
            lineTotalAfterDiscount,
            item.discount_percent || 0,
            discountAmount,
            item.notes || null,
            i + 1
          ];
          
          await client.query(itemQuery, itemValues);
          
          subtotal += lineTotalAfterDiscount;
          totalDiscountAmount += discountAmount;
        }
        
        // Calculate tax (assuming 0% for now - would be configurable)
        const taxRate = 0;
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;
        
        // Update quote totals
        const updateQuery = `
          UPDATE ${this.tableName}
          SET subtotal = $1, tax_amount = $2, discount_amount = $3, total_amount = $4
          WHERE id = $5
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
          subtotal,
          taxAmount,
          totalDiscountAmount,
          totalAmount,
          quote.id
        ]);
        
        const updatedQuote = updateResult.rows[0];
        
        logger.info('Quote created successfully', {
          quoteId: quote.id,
          quoteNumber: quote.quote_number,
          customerId: quote.customer_id,
          totalAmount: updatedQuote.total_amount,
          itemCount: quoteData.items.length
        });
        
        return updatedQuote;
      });
    } catch (error) {
      logger.error('Error creating quote', { quoteData, error });
      throw error;
    }
  }

  /**
   * Get quote by ID with items
   */
  public async getById(id: string, includeItems: boolean = true): Promise<Quote | null> {
    try {
      Validator.validateUUIDFormat(id, 'Quote ID');
      
      const quoteQuery = `
        SELECT 
          q.*,
          c.customer_number, c.company_name, c.first_name as customer_first_name,
          c.last_name as customer_last_name, c.email as customer_email,
          u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM ${this.tableName} q
        LEFT JOIN customers c ON q.customer_id = c.id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE q.id = $1
      `;
      
      const result = await database.query(quoteQuery, [id]);
      const quote = result.rows[0];
      
      if (!quote) {
        return null;
      }
      
      // Add customer information
      quote.customer = {
        id: quote.customer_id,
        customer_number: quote.customer_number,
        company_name: quote.company_name,
        first_name: quote.customer_first_name,
        last_name: quote.customer_last_name,
        email: quote.customer_email
      };
      
      if (includeItems) {
        quote.quote_items = await this.getQuoteItems(id);
      }
      
      return quote;
    } catch (error) {
      logger.error('Error getting quote by ID', { quoteId: id, error });
      throw error;
    }
  }

  /**
   * Update quote
   */
  public async update(id: string, updates: Partial<{
    customer_id: string;
    status: QuoteStatus;
    valid_until: Date;
    notes: string;
    approved_by: string;
  }>): Promise<Quote> {
    try {
      Validator.validateUUIDFormat(id, 'Quote ID');
      
      const quote = await this.getById(id, false);
      if (!quote) {
        throw new NotFoundError('Quote not found');
      }
      
      // Validate status transitions
      if (updates.status && !this.isValidStatusTransition(quote.status, updates.status)) {
        throw new ValidationError(`Invalid status transition from ${quote.status} to ${updates.status}`);
      }
      
      // Validate updates
      if (updates.customer_id) {
        Validator.validateUUIDFormat(updates.customer_id, 'Customer ID');
      }
      
      if (updates.status) {
        Validator.validateQuoteStatus(updates.status);
      }
      
      if (updates.approved_by) {
        Validator.validateUUIDFormat(updates.approved_by, 'Approved by user ID');
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });
      
      // Add approved_at if status is being set to approved
      if (updates.status === QuoteStatus.APPROVED) {
        updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await database.query(query, values);
      const updatedQuote = result.rows[0];
      
      logger.info('Quote updated successfully', {
        quoteId: id,
        updates: Object.keys(updates)
      });
      
      return updatedQuote;
    } catch (error) {
      logger.error('Error updating quote', { quoteId: id, updates, error });
      throw error;
    }
  }

  /**
   * Delete quote
   */
  public async delete(id: string): Promise<void> {
    try {
      Validator.validateUUIDFormat(id, 'Quote ID');
      
      const quote = await this.getById(id, false);
      if (!quote) {
        throw new NotFoundError('Quote not found');
      }
      
      // Can only delete draft quotes
      if (quote.status !== QuoteStatus.DRAFT) {
        throw new ConflictError('Can only delete draft quotes');
      }
      
      await database.transaction(async (client) => {
        // Delete quote items first
        await client.query(`DELETE FROM ${this.itemsTableName} WHERE quote_id = $1`, [id]);
        
        // Delete quote
        await client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
      });
      
      logger.info('Quote deleted successfully', { quoteId: id });
    } catch (error) {
      logger.error('Error deleting quote', { quoteId: id, error });
      throw error;
    }
  }

  /**
   * List quotes with pagination and filtering
   */
  public async list(params: SearchParams & {
    customer_id?: string;
    status?: QuoteStatus;
    created_by?: string;
  } = {}): Promise<{ quotes: Quote[]; total: number }> {
    try {
      const { page = 1, limit = 20, search, sort = 'created_at', order = 'desc' } = params;
      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (params.customer_id) {
        Validator.validateUUIDFormat(params.customer_id, 'Customer ID');
        conditions.push(`q.customer_id = $${paramCount}`);
        values.push(params.customer_id);
        paramCount++;
      }
      
      if (params.status) {
        conditions.push(`q.status = $${paramCount}`);
        values.push(params.status);
        paramCount++;
      }
      
      if (params.created_by) {
        Validator.validateUUIDFormat(params.created_by, 'Created by user ID');
        conditions.push(`q.created_by = $${paramCount}`);
        values.push(params.created_by);
        paramCount++;
      }
      
      if (search) {
        conditions.push(`(
          q.quote_number ILIKE $${paramCount} OR 
          c.company_name ILIKE $${paramCount} OR 
          c.first_name ILIKE $${paramCount} OR 
          c.last_name ILIKE $${paramCount} OR
          c.email ILIKE $${paramCount}
        )`);
        values.push(`%${search}%`);
        paramCount++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderClause = `ORDER BY q.${sort} ${order.toUpperCase()}`;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT q.id) as total
        FROM ${this.tableName} q
        LEFT JOIN customers c ON q.customer_id = c.id
        ${whereClause}
      `;
      
      const countResult = await database.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);
      
      // Get quotes
      values.push(limit, offset);
      const query = `
        SELECT 
          q.*,
          c.customer_number, c.company_name, c.first_name as customer_first_name,
          c.last_name as customer_last_name, c.email as customer_email,
          u.first_name as created_by_first_name, u.last_name as created_by_last_name,
          COUNT(qi.id) as item_count
        FROM ${this.tableName} q
        LEFT JOIN customers c ON q.customer_id = c.id
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN ${this.itemsTableName} qi ON q.id = qi.quote_id
        ${whereClause}
        GROUP BY q.id, c.id, u.id
        ${orderClause}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const result = await database.query(query, values);
      
      const quotes = result.rows.map(quote => ({
        ...quote,
        customer: {
          id: quote.customer_id,
          customer_number: quote.customer_number,
          company_name: quote.company_name,
          first_name: quote.customer_first_name,
          last_name: quote.customer_last_name,
          email: quote.customer_email
        },
        item_count: parseInt(quote.item_count)
      }));
      
      return { quotes, total };
    } catch (error) {
      logger.error('Error listing quotes', { params, error });
      throw error;
    }
  }

  /**
   * Get quote items
   */
  private async getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
    try {
      const query = `
        SELECT 
          qi.*,
          pv.sku as variant_sku,
          p.item_code, p.name as product_name, p.description as product_description,
          co.name as color_name, co.display_name as color_display_name,
          bm.code as material_code, bm.name as material_name
        FROM ${this.itemsTableName} qi
        LEFT JOIN product_variants pv ON qi.product_variant_id = pv.id
        LEFT JOIN products p ON pv.product_id = p.id
        LEFT JOIN color_options co ON pv.color_option_id = co.id
        LEFT JOIN box_materials bm ON qi.box_material_id = bm.id
        WHERE qi.quote_id = $1
        ORDER BY qi.line_number
      `;
      
      const result = await database.query(query, [quoteId]);
      
      return result.rows.map(item => ({
        ...item,
        product_variant: {
          id: item.product_variant_id,
          sku: item.variant_sku,
          product: {
            id: item.product_id,
            item_code: item.item_code,
            name: item.product_name,
            description: item.product_description
          },
          color_option: {
            id: item.color_option_id,
            name: item.color_name,
            display_name: item.color_display_name
          }
        },
        box_material: {
          id: item.box_material_id,
          code: item.material_code,
          name: item.material_name
        }
      }));
    } catch (error) {
      logger.error('Error getting quote items', { quoteId, error });
      throw error;
    }
  }

  /**
   * Generate unique quote number
   */
  private async generateQuoteNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const prefix = `Q${year}`;
      
      // Get the highest existing quote number for this year
      const query = `
        SELECT quote_number
        FROM ${this.tableName}
        WHERE quote_number LIKE $1
        ORDER BY quote_number DESC
        LIMIT 1
      `;
      
      const result = await database.query(query, [`${prefix}%`]);
      
      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastNumber = result.rows[0].quote_number;
        const numberPart = lastNumber.replace(prefix, '');
        nextNumber = parseInt(numberPart) + 1;
      }
      
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating quote number', error);
      throw error;
    }
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(currentStatus: QuoteStatus, newStatus: QuoteStatus): boolean {
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT, QuoteStatus.EXPIRED],
      [QuoteStatus.SENT]: [QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      [QuoteStatus.APPROVED]: [QuoteStatus.EXPIRED],
      [QuoteStatus.REJECTED]: [],
      [QuoteStatus.EXPIRED]: []
    };
    
    return validTransitions[currentStatus].includes(newStatus);
  }

  /**
   * Recalculate quote totals
   */
  public async recalculateTotals(quoteId: string): Promise<Quote> {
    try {
      Validator.validateUUIDFormat(quoteId, 'Quote ID');
      
      return await database.transaction(async (client) => {
        // Get all quote items
        const itemsQuery = `
          SELECT SUM(line_total) as subtotal, SUM(discount_amount) as total_discount
          FROM ${this.itemsTableName}
          WHERE quote_id = $1
        `;
        
        const itemsResult = await client.query(itemsQuery, [quoteId]);
        const { subtotal = 0, total_discount = 0 } = itemsResult.rows[0];
        
        // Calculate tax (assuming 0% for now)
        const taxRate = 0;
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;
        
        // Update quote totals
        const updateQuery = `
          UPDATE ${this.tableName}
          SET subtotal = $1, tax_amount = $2, discount_amount = $3, 
              total_amount = $4, updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [
          subtotal,
          taxAmount,
          total_discount,
          totalAmount,
          quoteId
        ]);
        
        return result.rows[0];
      });
    } catch (error) {
      logger.error('Error recalculating quote totals', { quoteId, error });
      throw error;
    }
  }
}