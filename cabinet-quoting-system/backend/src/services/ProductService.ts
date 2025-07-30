import {
  Product,
  ProductVariant,
  ProductPricing,
  ProductCatalogItem,
  ProductVariantWithPricing,
  SearchParams,
  ValidationError,
  NotFoundError
} from '@/types';
import database from '@/config/database';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class ProductService {
  /**
   * Get consolidated cabinet types catalog with size options and pricing ranges
   */
  public async getCatalog(params: SearchParams = {}): Promise<{
    products: ConsolidatedCabinetType[];
    total: number;
  }> {
    try {
      const { page = 1, limit = 100, search, filters, sort = 'name', order = 'asc' } = params;
      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      const conditions: string[] = ['p.is_active = true'];
      const values: any[] = [];
      let paramCount = 1;
      
      if (search) {
        conditions.push(`(
          p.name ILIKE $${paramCount} OR 
          p.item_code ILIKE $${paramCount} OR 
          p.description ILIKE $${paramCount}
        )`);
        values.push(`%${search}%`);
        paramCount++;
      }
      
      if (filters?.category_id) {
        conditions.push(`ct.category_id = $${paramCount}`);
        values.push(filters.category_id);
        paramCount++;
      }
      
      if (filters?.cabinet_type_id) {
        conditions.push(`p.cabinet_type_id = $${paramCount}`);
        values.push(filters.cabinet_type_id);
        paramCount++;
      }
      
      if (filters?.width) {
        conditions.push(`p.width = $${paramCount}`);
        values.push(filters.width);
        paramCount++;
      }
      
      if (filters?.height) {
        conditions.push(`p.height = $${paramCount}`);
        values.push(filters.height);
        paramCount++;
      }
      
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const orderClause = `ORDER BY p.${sort} ${order.toUpperCase()}`;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM products p
        LEFT JOIN cabinet_types ct ON p.cabinet_type_id = ct.id
        LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id
        ${whereClause}
      `;
      
      const countResult = await database.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);
      
      // Get products with basic info
      values.push(limit, offset);
      const productsQuery = `
        SELECT 
          p.id, p.item_code, p.name, p.description,
          p.width, p.height, p.depth, p.door_count, p.drawer_count,
          p.is_left_right, p.created_at, p.updated_at,
          ct.name as type_name,
          cc.name as category_name
        FROM products p
        LEFT JOIN cabinet_types ct ON p.cabinet_type_id = ct.id
        LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const productsResult = await database.query(productsQuery, values);
      const products = productsResult.rows;
      
      // Get variants and pricing for each product
      const catalogItems: ProductCatalogItem[] = [];
      
      for (const product of products) {
        const variants = await this.getProductVariantsWithPricing(product.id);
        
        catalogItems.push({
          id: product.id,
          item_code: product.item_code,
          name: product.name,
          description: product.description,
          category_name: product.category_name,
          type_name: product.type_name,
          width: product.width,
          height: product.height,
          depth: product.depth,
          door_count: product.door_count,
          drawer_count: product.drawer_count,
          is_left_right: product.is_left_right,
          variants
        });
      }
      
      return { products: catalogItems, total };
    } catch (error) {
      logger.error('Error getting product catalog', { params, error });
      throw error;
    }
  }

  /**
   * Get product by ID with variants and pricing
   */
  public async getById(id: string): Promise<ProductCatalogItem | null> {
    try {
      Validator.validateUUIDFormat(id, 'Product ID');
      
      const query = `
        SELECT 
          p.id, p.item_code, p.name, p.description,
          p.width, p.height, p.depth, p.door_count, p.drawer_count,
          p.is_left_right, p.created_at, p.updated_at,
          ct.name as type_name,
          cc.name as category_name
        FROM products p
        LEFT JOIN cabinet_types ct ON p.cabinet_type_id = ct.id
        LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id
        WHERE p.id = $1 AND p.is_active = true
      `;
      
      const result = await database.query(query, [id]);
      const product = result.rows[0];
      
      if (!product) {
        return null;
      }
      
      const variants = await this.getProductVariantsWithPricing(product.id);
      
      return {
        id: product.id,
        item_code: product.item_code,
        name: product.name,
        description: product.description,
        category_name: product.category_name,
        type_name: product.type_name,
        width: product.width,
        height: product.height,
        depth: product.depth,
        door_count: product.door_count,
        drawer_count: product.drawer_count,
        is_left_right: product.is_left_right,
        variants
      };
    } catch (error) {
      logger.error('Error getting product by ID', { productId: id, error });
      throw error;
    }
  }

  /**
   * Get product variants with pricing
   */
  private async getProductVariantsWithPricing(productId: string): Promise<ProductVariantWithPricing[]> {
    try {
      const variantsQuery = `
        SELECT 
          pv.id, pv.sku, pv.is_active,
          co.id as color_option_id, co.name as color_name, 
          co.display_name as color_display_name, co.description as color_description
        FROM product_variants pv
        LEFT JOIN color_options co ON pv.color_option_id = co.id
        WHERE pv.product_id = $1 AND pv.is_active = true
        ORDER BY co.display_name
      `;
      
      const variantsResult = await database.query(variantsQuery, [productId]);
      const variants = variantsResult.rows;
      
      const variantsWithPricing: ProductVariantWithPricing[] = [];
      
      for (const variant of variants) {
        // Get pricing for this variant
        const pricingQuery = `
          SELECT 
            pp.id, pp.price, pp.effective_date, pp.expiration_date, pp.is_active,
            bm.id as box_material_id, bm.code as material_code, 
            bm.name as material_name, bm.description as material_description
          FROM product_pricing pp
          LEFT JOIN box_materials bm ON pp.box_material_id = bm.id
          WHERE pp.product_variant_id = $1 
            AND pp.is_active = true
            AND pp.effective_date <= CURRENT_DATE
            AND (pp.expiration_date IS NULL OR pp.expiration_date > CURRENT_DATE)
          ORDER BY bm.sort_order, bm.name
        `;
        
        const pricingResult = await database.query(pricingQuery, [variant.id]);
        
        // Get inventory information
        const inventoryQuery = `
          SELECT on_hand_quantity, reserved_quantity, available_quantity, reorder_point
          FROM inventory
          WHERE product_variant_id = $1
        `;
        
        const inventoryResult = await database.query(inventoryQuery, [variant.id]);
        const inventory = inventoryResult.rows[0] || null;
        
        variantsWithPricing.push({
          id: variant.id,
          sku: variant.sku,
          color_option: {
            id: variant.color_option_id,
            name: variant.color_name,
            display_name: variant.color_display_name,
            description: variant.color_description,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          pricing: pricingResult.rows.map(p => ({
            id: p.id,
            product_variant_id: variant.id,
            box_material_id: p.box_material_id,
            price: parseFloat(p.price),
            effective_date: p.effective_date,
            expiration_date: p.expiration_date,
            is_active: p.is_active,
            created_at: new Date(),
            updated_at: new Date(),
            box_material: {
              id: p.box_material_id,
              code: p.material_code,
              name: p.material_name,
              description: p.material_description,
              is_active: true,
              sort_order: 0,
              created_at: new Date(),
              updated_at: new Date()
            }
          })),
          inventory
        });
      }
      
      return variantsWithPricing;
    } catch (error) {
      logger.error('Error getting product variants with pricing', { productId, error });
      throw error;
    }
  }

  /**
   * Search products by item code or name
   */
  public async search(query: string, limit: number = 10): Promise<Product[]> {
    try {
      if (!query || query.trim().length < 2) {
        throw new ValidationError('Search query must be at least 2 characters');
      }
      
      const searchQuery = `
        SELECT 
          p.id, p.item_code, p.name, p.description,
          p.cabinet_type_id, p.width, p.height, p.depth,
          p.door_count, p.drawer_count, p.is_left_right,
          p.is_active, p.created_at, p.updated_at
        FROM products p
        WHERE p.is_active = true
          AND (
            p.name ILIKE $1 OR 
            p.item_code ILIKE $1 OR 
            p.description ILIKE $1
          )
        ORDER BY 
          CASE 
            WHEN p.item_code ILIKE $2 THEN 1
            WHEN p.name ILIKE $2 THEN 2
            ELSE 3
          END,
          p.name
        LIMIT $3
      `;
      
      const searchTerm = `%${query.trim()}%`;
      const exactTerm = `${query.trim()}%`;
      
      const result = await database.query(searchQuery, [searchTerm, exactTerm, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching products', { query, error });
      throw error;
    }
  }

  /**
   * Get cabinet categories
   */
  public async getCategories(): Promise<any[]> {
    try {
      const query = `
        SELECT id, code, name, description, parent_category_id, sort_order, is_active
        FROM cabinet_categories
        WHERE is_active = true
        ORDER BY sort_order, name
      `;
      
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting cabinet categories', error);
      throw error;
    }
  }

  /**
   * Get cabinet types by category
   */
  public async getCabinetTypes(categoryId?: string): Promise<any[]> {
    try {
      let query = `
        SELECT ct.id, ct.code, ct.name, ct.description, ct.category_id, 
               ct.is_active, ct.sort_order,
               cc.name as category_name
        FROM cabinet_types ct
        LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id
        WHERE ct.is_active = true
      `;
      
      const values: any[] = [];
      
      if (categoryId) {
        Validator.validateUUIDFormat(categoryId, 'Category ID');
        query += ` AND ct.category_id = $1`;
        values.push(categoryId);
      }
      
      query += ` ORDER BY ct.sort_order, ct.name`;
      
      const result = await database.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting cabinet types', { categoryId, error });
      throw error;
    }
  }

  /**
   * Get color options
   */
  public async getColorOptions(): Promise<any[]> {
    try {
      const query = `
        SELECT id, name, display_name, description, is_active
        FROM color_options
        WHERE is_active = true
        ORDER BY display_name
      `;
      
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting color options', error);
      throw error;
    }
  }

  /**
   * Get box materials
   */
  public async getBoxMaterials(): Promise<any[]> {
    try {
      const query = `
        SELECT id, code, name, description, is_active, sort_order
        FROM box_materials
        WHERE is_active = true
        ORDER BY sort_order, name
      `;
      
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting box materials', error);
      throw error;
    }
  }

  /**
   * Get product pricing for specific variant and material
   */
  public async getPrice(
    productVariantId: string,
    boxMaterialId: string,
    date: Date = new Date()
  ): Promise<number | null> {
    try {
      Validator.validateUUIDFormat(productVariantId, 'Product Variant ID');
      Validator.validateUUIDFormat(boxMaterialId, 'Box Material ID');
      
      const query = `
        SELECT price
        FROM product_pricing
        WHERE product_variant_id = $1
          AND box_material_id = $2
          AND is_active = true
          AND effective_date <= $3
          AND (expiration_date IS NULL OR expiration_date > $3)
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      
      const result = await database.query(query, [productVariantId, boxMaterialId, date]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return parseFloat(result.rows[0].price);
    } catch (error) {
      logger.error('Error getting product price', {
        productVariantId,
        boxMaterialId,
        date,
        error
      });
      throw error;
    }
  }

  /**
   * Check inventory availability
   */
  public async checkInventory(productVariantId: string): Promise<{
    on_hand: number;
    reserved: number;
    available: number;
    reorder_point?: number;
  } | null> {
    try {
      Validator.validateUUIDFormat(productVariantId, 'Product Variant ID');
      
      const query = `
        SELECT on_hand_quantity, reserved_quantity, available_quantity, reorder_point
        FROM inventory
        WHERE product_variant_id = $1
      `;
      
      const result = await database.query(query, [productVariantId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const inventory = result.rows[0];
      return {
        on_hand: inventory.on_hand_quantity,
        reserved: inventory.reserved_quantity,
        available: inventory.available_quantity,
        reorder_point: inventory.reorder_point
      };
    } catch (error) {
      logger.error('Error checking inventory', { productVariantId, error });
      throw error;
    }
  }

  /**
   * Get product dimensions for calculations
   */
  public async getDimensions(productId: string): Promise<{
    width?: number;
    height?: number;
    depth?: number;
  } | null> {
    try {
      Validator.validateUUIDFormat(productId, 'Product ID');
      
      const query = `
        SELECT width, height, depth
        FROM products
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await database.query(query, [productId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting product dimensions', { productId, error });
      throw error;
    }
  }

  /**\n   * Get available sizes for a consolidated cabinet type\n   */\n  public async getAvailableSizes(baseCabinetType: string): Promise<number[]> {\n    try {\n      const query = `\n        SELECT DISTINCT width_inches_extracted\n        FROM products\n        WHERE is_active = true \n          AND base_cabinet_type = $1\n          AND width_inches_extracted IS NOT NULL\n        ORDER BY width_inches_extracted\n      `;\n      \n      const result = await database.query(query, [baseCabinetType]);\n      return result.rows.map(row => parseFloat(row.width_inches_extracted));\n    } catch (error) {\n      logger.error('Error getting available sizes', { baseCabinetType, error });\n      throw error;\n    }\n  }\n\n  /**\n   * Get all consolidated cabinet types (for filters/dropdowns)\n   */\n  public async getConsolidatedTypes(): Promise<{\n    base_cabinet_type: string;\n    display_name: string;\n    category_name: string;\n    product_count: number;\n  }[]> {\n    try {\n      const query = `\n        SELECT \n          p.base_cabinet_type,\n          p.display_name,\n          cc.name as category_name,\n          COUNT(DISTINCT p.id) as product_count\n        FROM products p\n        LEFT JOIN cabinet_types ct ON p.cabinet_type_id = ct.id\n        LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id\n        WHERE p.is_active = true \n          AND p.base_cabinet_type IS NOT NULL\n        GROUP BY p.base_cabinet_type, p.display_name, cc.name\n        ORDER BY cc.name, p.display_name\n      `;\n      \n      const result = await database.query(query);\n      return result.rows.map(row => ({\n        base_cabinet_type: row.base_cabinet_type,\n        display_name: row.display_name,\n        category_name: row.category_name,\n        product_count: parseInt(row.product_count)\n      }));\n    } catch (error) {\n      logger.error('Error getting consolidated types', error);\n      throw error;\n    }\n  }\n}\n\nexport default ProductService;