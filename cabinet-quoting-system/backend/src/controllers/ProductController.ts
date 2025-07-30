import { Request, Response } from 'express';
import { AuthRequest, SearchParams, ValidationError } from '@/types';
import { ProductService } from '@/services/ProductService';
import { ResponseHelper } from '@/utils/response';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Get consolidated cabinet types catalog (new default behavior)
   */
  public getCatalog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, category_id, cabinet_type_id, base_cabinet_type, sort, order } = req.query;
      
      const params: SearchParams = {
        page: page ? parseInt(page as string) : 1,
        limit: Math.min(parseInt((limit as string) || '100'), 100),
        search: search as string,
        sort: sort as string || 'display_name',
        order: (order as 'asc' | 'desc') || 'asc',
        filters: {}
      };
      
      // Add filters
      if (category_id) params.filters!.category_id = category_id as string;
      if (cabinet_type_id) params.filters!.cabinet_type_id = cabinet_type_id as string;
      if (base_cabinet_type) params.filters!.base_cabinet_type = base_cabinet_type as string;
      
      const result = await this.productService.getCatalog(params);
      
      ResponseHelper.paginated(
        res,
        result.products,
        result.total,
        params.page!,
        params.limit!,
        'Consolidated cabinet catalog retrieved successfully'
      );
      
    } catch (error) {
      logger.error('Error getting consolidated catalog', { query: req.query, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve consolidated catalog');
      }
    }
  };

  /**
   * Get legacy individual products catalog (for backward compatibility)
   */
  public getLegacyCatalog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, category_id, cabinet_type_id, width, height, sort, order } = req.query;
      
      const params: SearchParams = {
        page: page ? parseInt(page as string) : 1,
        limit: Math.min(parseInt((limit as string) || '100'), 100),
        search: search as string,
        sort: sort as string || 'name',
        order: (order as 'asc' | 'desc') || 'asc',
        filters: {}
      };
      
      // Add filters
      if (category_id) params.filters!.category_id = category_id as string;
      if (cabinet_type_id) params.filters!.cabinet_type_id = cabinet_type_id as string;
      if (width) params.filters!.width = parseInt(width as string);
      if (height) params.filters!.height = parseInt(height as string);
      
      const result = await this.productService.getLegacyCatalog(params);
      
      ResponseHelper.paginated(
        res,
        result.products,
        result.total,
        params.page!,
        params.limit!,
        'Legacy product catalog retrieved successfully'
      );
      
    } catch (error) {
      logger.error('Error getting legacy product catalog', { query: req.query, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve legacy product catalog');
      }
    }
  };

  /**
   * Get product by ID
   */
  public getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const product = await this.productService.getById(id);
      
      if (!product) {
        ResponseHelper.notFound(res, 'Product not found');
        return;
      }
      
      ResponseHelper.success(res, product, 'Product retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting product', { productId: req.params.id, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve product');
      }
    }
  };

  /**
   * Search products and consolidated types
   */
  public searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        ResponseHelper.validationError(res, 'Search query (q) is required');
        return;
      }
      
      const searchLimit = limit ? Math.min(parseInt(limit as string), 50) : 20;
      const results = await this.productService.search(q, searchLimit);
      
      ResponseHelper.success(res, {
        consolidated_types: results.consolidated_types,
        individual_products: results.individual_products,
        total_consolidated: results.consolidated_types.length,
        total_individual: results.individual_products.length
      }, 'Search completed successfully');
      
    } catch (error) {
      logger.error('Error searching products', { query: req.query, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Search failed');
      }
    }
  };

  /**
   * Get cabinet categories
   */
  public getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.productService.getCategories();
      ResponseHelper.success(res, categories, 'Categories retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting categories', error);
      ResponseHelper.serverError(res, 'Failed to retrieve categories');
    }
  };

  /**
   * Get cabinet types
   */
  public getCabinetTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category_id } = req.query;
      
      const cabinetTypes = await this.productService.getCabinetTypes(
        category_id as string
      );
      
      ResponseHelper.success(res, cabinetTypes, 'Cabinet types retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting cabinet types', { categoryId: req.query.category_id, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve cabinet types');
      }
    }
  };

  /**
   * Get color options
   */
  public getColorOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const colorOptions = await this.productService.getColorOptions();
      ResponseHelper.success(res, colorOptions, 'Color options retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting color options', error);
      ResponseHelper.serverError(res, 'Failed to retrieve color options');
    }
  };

  /**
   * Get box materials
   */
  public getBoxMaterials = async (req: Request, res: Response): Promise<void> => {
    try {
      const boxMaterials = await this.productService.getBoxMaterials();
      ResponseHelper.success(res, boxMaterials, 'Box materials retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting box materials', error);
      ResponseHelper.serverError(res, 'Failed to retrieve box materials');
    }
  };

  /**
   * Get product price
   */
  public getPrice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { variantId, materialId } = req.params;
      const { date } = req.query;
      
      const priceDate = date ? new Date(date as string) : new Date();
      
      if (date && !Validator.isValidDateString(date as string)) {
        ResponseHelper.validationError(res, 'Invalid date format');
        return;
      }
      
      const price = await this.productService.getPrice(variantId, materialId, priceDate);
      
      if (price === null) {
        ResponseHelper.notFound(res, 'Price not found for the specified variant and material');
        return;
      }
      
      ResponseHelper.success(res, {
        product_variant_id: variantId,
        box_material_id: materialId,
        price,
        date: priceDate.toISOString()
      }, 'Price retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting product price', {
        variantId: req.params.variantId,
        materialId: req.params.materialId,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve price');
      }
    }
  };

  /**
   * Check inventory
   */
  public checkInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { variantId } = req.params;
      
      const inventory = await this.productService.checkInventory(variantId);
      
      if (!inventory) {
        ResponseHelper.notFound(res, 'Inventory information not found');
        return;
      }
      
      ResponseHelper.success(res, {
        product_variant_id: variantId,
        ...inventory,
        low_stock: inventory.reorder_point ? inventory.available < inventory.reorder_point : false
      }, 'Inventory information retrieved successfully');
      
    } catch (error) {
      logger.error('Error checking inventory', {
        variantId: req.params.variantId,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to check inventory');
      }
    }
  };

  /**
   * Get product dimensions
   */
  public getDimensions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const dimensions = await this.productService.getDimensions(id);
      
      if (!dimensions) {
        ResponseHelper.notFound(res, 'Product dimensions not found');
        return;
      }
      
      ResponseHelper.success(res, {
        product_id: id,
        ...dimensions
      }, 'Product dimensions retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting product dimensions', {
        productId: req.params.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve dimensions');
      }
    }
  };

  /**
   * Get product filters for frontend filtering UI (enhanced with consolidated types)
   */
  public getFilters = async (req: Request, res: Response): Promise<void> => {
    try {
      const [categories, colorOptions, boxMaterials, consolidatedTypes] = await Promise.all([
        this.productService.getCategories(),
        this.productService.getColorOptions(),
        this.productService.getBoxMaterials(),
        this.productService.getConsolidatedTypes()
      ]);
      
      // Get unique dimensions from products (including extracted widths)
      const dimensionsQuery = `
        SELECT DISTINCT 
          width, height, depth, width_inches_extracted
        FROM products
        WHERE is_active = true
          AND (width IS NOT NULL OR width_inches_extracted IS NOT NULL)
          AND height IS NOT NULL
          AND depth IS NOT NULL
        ORDER BY width, height, depth, width_inches_extracted
      `;
      
      const dimensionsResult = await this.productService['database']?.query(dimensionsQuery);
      const dimensions = dimensionsResult?.rows || [];
      
      // Get unique extracted widths for consolidated types
      const extractedWidths = [...new Set(
        dimensions
          .map((d: any) => d.width_inches_extracted)
          .filter(Boolean)
      )].sort((a, b) => a - b);
      
      const filters = {
        categories,
        color_options: colorOptions,
        box_materials: boxMaterials,
        consolidated_types: consolidatedTypes,
        dimensions: {
          widths: [...new Set(dimensions.map((d: any) => d.width).filter(Boolean))].sort((a, b) => a - b),
          heights: [...new Set(dimensions.map((d: any) => d.height).filter(Boolean))].sort((a, b) => a - b),
          depths: [...new Set(dimensions.map((d: any) => d.depth).filter(Boolean))].sort((a, b) => a - b),
          extracted_widths: extractedWidths
        },
        // Group consolidated types by category for easier filtering
        consolidated_by_category: consolidatedTypes.reduce((acc: any, type) => {
          if (!acc[type.category_name]) {
            acc[type.category_name] = [];
          }
          acc[type.category_name].push(type);
          return acc;
        }, {})
      };
      
      ResponseHelper.success(res, filters, 'Product filters retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting product filters', error);
      ResponseHelper.serverError(res, 'Failed to retrieve product filters');
    }
  };

  /**
   * Get popular consolidated cabinet types (most quoted/ordered)
   */
  public getPopularProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit } = req.query;
      const resultLimit = Math.min(parseInt((limit as string) || '10'), 50);
      
      // This would typically be based on quote_items frequency
      // For now, we'll return recently created consolidated types
      const params: SearchParams = {
        page: 1,
        limit: resultLimit,
        sort: 'display_name',
        order: 'asc'
      };
      
      const result = await this.productService.getCatalog(params);
      
      ResponseHelper.success(res, result.products, 'Popular cabinet types retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting popular products', error);
      ResponseHelper.serverError(res, 'Failed to retrieve popular cabinet types');
    }
  };

  /**
   * Get consolidated cabinet type details with all available sizes
   */
  public getConsolidatedCabinetType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { base_cabinet_type } = req.params;
      
      const result = await this.productService.getConsolidatedCabinetType(base_cabinet_type);
      
      if (!result) {
        ResponseHelper.notFound(res, 'Consolidated cabinet type not found');
        return;
      }
      
      ResponseHelper.success(res, result, 'Consolidated cabinet type retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting consolidated cabinet type', {
        baseCabinetType: req.params.base_cabinet_type,
        error
      });
      
      ResponseHelper.serverError(res, 'Failed to retrieve consolidated cabinet type');
    }
  };

  /**
   * Get available sizes for a consolidated cabinet type
   */
  public getAvailableSizes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { base_cabinet_type } = req.params;
      
      const sizes = await this.productService.getAvailableSizes(base_cabinet_type);
      
      ResponseHelper.success(res, {
        base_cabinet_type,
        available_sizes: sizes,
        size_count: sizes.length
      }, 'Available sizes retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting available sizes', {
        baseCabinetType: req.params.base_cabinet_type,
        error
      });
      
      ResponseHelper.serverError(res, 'Failed to retrieve available sizes');
    }
  };

  /**
   * Get products for a specific consolidated type and size
   */
  public getProductsBySize = async (req: Request, res: Response): Promise<void> => {
    try {
      const { base_cabinet_type, size } = req.params;
      const sizeInches = parseFloat(size);
      
      if (isNaN(sizeInches)) {
        ResponseHelper.validationError(res, 'Invalid size parameter');
        return;
      }
      
      const products = await this.productService.getProductsBySize(base_cabinet_type, sizeInches);
      
      ResponseHelper.success(res, {
        base_cabinet_type,
        size_inches: sizeInches,
        products,
        product_count: products.length
      }, 'Products by size retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting products by size', {
        baseCabinetType: req.params.base_cabinet_type,
        size: req.params.size,
        error
      });
      
      ResponseHelper.serverError(res, 'Failed to retrieve products by size');
    }
  };

  /**
   * Get all consolidated cabinet types (for filters/dropdowns)
   */
  public getConsolidatedTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const consolidatedTypes = await this.productService.getConsolidatedTypes();
      
      ResponseHelper.success(res, consolidatedTypes, 'Consolidated types retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting consolidated types', error);
      ResponseHelper.serverError(res, 'Failed to retrieve consolidated types');
    }
  };
}