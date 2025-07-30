import { Customer, ValidationError, NotFoundError, ConflictError, SearchParams } from '@/types';
import database from '@/config/database';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class CustomerService {
  private readonly tableName = 'customers';

  /**
   * Create a new customer
   */
  public async create(customerData: {
    company_name?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    notes?: string;
  }): Promise<Customer> {
    try {
      // Validate required fields
      Validator.validateRequiredFields(customerData, ['first_name', 'last_name', 'email']);
      Validator.validateEmailFormat(customerData.email);
      Validator.validateStringLength(customerData.first_name, 1, 100, 'First name');
      Validator.validateStringLength(customerData.last_name, 1, 100, 'Last name');
      
      if (customerData.company_name) {
        Validator.validateStringLength(customerData.company_name, 1, 200, 'Company name');
      }
      
      // Check if customer with email already exists
      const existingCustomer = await this.findByEmail(customerData.email);
      if (existingCustomer) {
        throw new ConflictError('Customer with this email already exists');
      }
      
      // Generate customer number
      const customerNumber = await this.generateCustomerNumber();
      
      const query = `
        INSERT INTO ${this.tableName} (
          customer_number, company_name, first_name, last_name, email, phone,
          address_line1, address_line2, city, state_province, postal_code,
          country, is_active, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        customerNumber,
        customerData.company_name || null,
        customerData.first_name.trim(),
        customerData.last_name.trim(),
        customerData.email.toLowerCase(),
        customerData.phone || null,
        customerData.address_line1 || null,
        customerData.address_line2 || null,
        customerData.city || null,
        customerData.state_province || null,
        customerData.postal_code || null,
        customerData.country || null,
        true,
        customerData.notes || null
      ];
      
      const result = await database.query(query, values);
      const customer = result.rows[0];
      
      logger.info('Customer created successfully', {
        customerId: customer.id,
        customerNumber: customer.customer_number,
        email: customer.email
      });
      
      return customer;
    } catch (error) {
      logger.error('Error creating customer', { customerData, error });
      throw error;
    }
  }

  /**
   * Find customer by ID
   */
  public async findById(id: string): Promise<Customer | null> {
    try {
      Validator.validateUUIDFormat(id, 'Customer ID');
      
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await database.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer by ID', { customerId: id, error });
      throw error;
    }
  }

  /**
   * Find customer by email
   */
  public async findByEmail(email: string): Promise<Customer | null> {
    try {
      Validator.validateEmailFormat(email);
      
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await database.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer by email', { email, error });
      throw error;
    }
  }

  /**
   * Find customer by customer number
   */
  public async findByCustomerNumber(customerNumber: string): Promise<Customer | null> {
    try {
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE customer_number = $1 AND is_active = true
      `;
      
      const result = await database.query(query, [customerNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding customer by number', { customerNumber, error });
      throw error;
    }
  }

  /**
   * Update customer
   */
  public async update(id: string, updates: Partial<{
    company_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
    notes: string;
  }>): Promise<Customer> {
    try {
      Validator.validateUUIDFormat(id, 'Customer ID');
      
      const customer = await this.findById(id);
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
      
      // Validate updates
      if (updates.email) {
        Validator.validateEmailFormat(updates.email);
        
        // Check if email is already taken by another customer
        const existingCustomer = await this.findByEmail(updates.email);
        if (existingCustomer && existingCustomer.id !== id) {
          throw new ConflictError('Email is already taken by another customer');
        }
      }
      
      if (updates.first_name) {
        Validator.validateStringLength(updates.first_name, 1, 100, 'First name');
      }
      
      if (updates.last_name) {
        Validator.validateStringLength(updates.last_name, 1, 100, 'Last name');
      }
      
      if (updates.company_name) {
        Validator.validateStringLength(updates.company_name, 1, 200, 'Company name');
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(key === 'email' ? value.toLowerCase() : value);
          paramCount++;
        }
      });
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await database.query(query, values);
      const updatedCustomer = result.rows[0];
      
      logger.info('Customer updated successfully', {
        customerId: id,
        updates: Object.keys(updates)
      });
      
      return updatedCustomer;
    } catch (error) {
      logger.error('Error updating customer', { customerId: id, updates, error });
      throw error;
    }
  }

  /**
   * List customers with pagination and search
   */
  public async list(params: SearchParams = {}): Promise<{
    customers: Customer[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 20, search, sort = 'created_at', order = 'desc' } = params;
      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramCount = 1;
      
      if (search) {
        conditions.push(`(
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          company_name ILIKE $${paramCount} OR 
          email ILIKE $${paramCount} OR
          customer_number ILIKE $${paramCount}
        )`);
        values.push(`%${search}%`);
        paramCount++;
      }
      
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const orderClause = `ORDER BY ${sort} ${order.toUpperCase()}`;
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await database.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);
      
      // Get customers
      values.push(limit, offset);
      const query = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ${orderClause}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const result = await database.query(query, values);
      
      return {
        customers: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error listing customers', { params, error });
      throw error;
    }
  }

  /**
   * Search customers
   */
  public async search(query: string, limit: number = 10): Promise<Customer[]> {
    try {
      if (!query || query.trim().length < 2) {
        throw new ValidationError('Search query must be at least 2 characters');
      }
      
      const searchQuery = `
        SELECT * FROM ${this.tableName}
        WHERE is_active = true
          AND (
            first_name ILIKE $1 OR 
            last_name ILIKE $1 OR 
            company_name ILIKE $1 OR 
            email ILIKE $1 OR
            customer_number ILIKE $1
          )
        ORDER BY 
          CASE 
            WHEN customer_number ILIKE $2 THEN 1
            WHEN email ILIKE $2 THEN 2
            WHEN company_name ILIKE $2 THEN 3
            ELSE 4
          END,
          last_name, first_name
        LIMIT $3
      `;
      
      const searchTerm = `%${query.trim()}%`;
      const exactTerm = `${query.trim()}%`;
      
      const result = await database.query(searchQuery, [searchTerm, exactTerm, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching customers', { query, error });
      throw error;
    }
  }

  /**
   * Delete customer (soft delete)
   */
  public async delete(id: string): Promise<void> {
    try {
      Validator.validateUUIDFormat(id, 'Customer ID');
      
      const customer = await this.findById(id);
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
      
      // Check if customer has active quotes
      const quotesQuery = `
        SELECT COUNT(*) as quote_count
        FROM quotes
        WHERE customer_id = $1 AND status IN ('draft', 'sent')
      `;
      
      const quotesResult = await database.query(quotesQuery, [id]);
      const activeQuotes = parseInt(quotesResult.rows[0].quote_count);
      
      if (activeQuotes > 0) {
        throw new ConflictError('Cannot delete customer with active quotes');
      }
      
      const query = `
        UPDATE ${this.tableName}
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await database.query(query, [id]);
      
      logger.info('Customer deleted successfully', { customerId: id });
    } catch (error) {
      logger.error('Error deleting customer', { customerId: id, error });
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  public async getStatistics(customerId: string): Promise<{
    total_quotes: number;
    approved_quotes: number;
    total_quote_value: number;
    last_quote_date?: Date;
  }> {
    try {
      Validator.validateUUIDFormat(customerId, 'Customer ID');
      
      const query = `
        SELECT 
          COUNT(*) as total_quotes,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_quotes,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as total_quote_value,
          MAX(created_at) as last_quote_date
        FROM quotes
        WHERE customer_id = $1
      `;
      
      const result = await database.query(query, [customerId]);
      const stats = result.rows[0];
      
      return {
        total_quotes: parseInt(stats.total_quotes),
        approved_quotes: parseInt(stats.approved_quotes),
        total_quote_value: parseFloat(stats.total_quote_value),
        last_quote_date: stats.last_quote_date
      };
    } catch (error) {
      logger.error('Error getting customer statistics', { customerId, error });
      throw error;
    }
  }

  /**
   * Generate unique customer number
   */
  private async generateCustomerNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const prefix = `CUST${year}`;
      
      // Get the highest existing customer number for this year
      const query = `
        SELECT customer_number
        FROM ${this.tableName}
        WHERE customer_number LIKE $1
        ORDER BY customer_number DESC
        LIMIT 1
      `;
      
      const result = await database.query(query, [`${prefix}%`]);
      
      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastNumber = result.rows[0].customer_number;
        const numberPart = lastNumber.replace(prefix, '');
        nextNumber = parseInt(numberPart) + 1;
      }
      
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating customer number', error);
      throw error;
    }
  }

  /**
   * Get customers by location
   */
  public async getByLocation(params: {
    city?: string;
    state_province?: string;
    country?: string;
    limit?: number;
  } = {}): Promise<Customer[]> {
    try {
      const { city, state_province, country, limit = 50 } = params;
      
      const conditions: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramCount = 1;
      
      if (city) {
        conditions.push(`city ILIKE $${paramCount}`);
        values.push(`%${city}%`);
        paramCount++;
      }
      
      if (state_province) {
        conditions.push(`state_province ILIKE $${paramCount}`);
        values.push(`%${state_province}%`);
        paramCount++;
      }
      
      if (country) {
        conditions.push(`country ILIKE $${paramCount}`);
        values.push(`%${country}%`);
        paramCount++;
      }
      
      values.push(limit);
      
      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${conditions.join(' AND ')}
        ORDER BY last_name, first_name
        LIMIT $${paramCount}
      `;
      
      const result = await database.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting customers by location', { params, error });
      throw error;
    }
  }
}