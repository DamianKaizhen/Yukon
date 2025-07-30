import { Router } from 'express';
import { ProductController } from '@/controllers/ProductController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { query } from 'express-validator';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();
const productController = new ProductController();

// Validation middleware
const catalogValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['name', 'item_code', 'created_at', 'width', 'height', 'display_name', 'base_cabinet_type']),
  query('order').optional().isIn(['asc', 'desc']),
  validationMiddleware
];

const consolidatedCatalogValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['display_name', 'base_cabinet_type', 'category_name']),
  query('order').optional().isIn(['asc', 'desc']),
  validationMiddleware
];

const searchValidation = [
  query('q').isLength({ min: 2, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validationMiddleware
];

// Public routes (with optional auth for personalization)
// Consolidated catalog (new default behavior)
router.get('/catalog', optionalAuth, consolidatedCatalogValidation, productController.getCatalog);
router.get('/consolidated', optionalAuth, consolidatedCatalogValidation, productController.getCatalog);

// Legacy individual products catalog (for backward compatibility)
router.get('/catalog/legacy', optionalAuth, catalogValidation, productController.getLegacyCatalog);

// Consolidated type operations
router.get('/consolidated/:base_cabinet_type', optionalAuth, productController.getConsolidatedCabinetType);
router.get('/consolidated/:base_cabinet_type/sizes', optionalAuth, productController.getAvailableSizes);
router.get('/consolidated/:base_cabinet_type/products/:size', optionalAuth, productController.getProductsBySize);
router.get('/consolidated-types', optionalAuth, productController.getConsolidatedTypes);

// Search (updated to support both consolidated and individual)
router.get('/search', optionalAuth, searchValidation, productController.searchProducts);

// Filter and metadata routes
router.get('/categories', optionalAuth, productController.getCategories);
router.get('/cabinet-types', optionalAuth, productController.getCabinetTypes);
router.get('/color-options', optionalAuth, productController.getColorOptions);
router.get('/box-materials', optionalAuth, productController.getBoxMaterials);
router.get('/filters', optionalAuth, productController.getFilters);
router.get('/popular', optionalAuth, productController.getPopularProducts);

// Product details
router.get('/:id', optionalAuth, productController.getProduct);
router.get('/:id/dimensions', optionalAuth, productController.getDimensions);

// Pricing and inventory (authenticated routes)
router.get('/:variantId/pricing/:materialId', authenticate, productController.getPrice);
router.get('/:variantId/inventory', authenticate, productController.checkInventory);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         item_code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category_name:
 *           type: string
 *         type_name:
 *           type: string
 *         width:
 *           type: number
 *         height:
 *           type: number
 *         depth:
 *           type: number
 *         door_count:
 *           type: integer
 *         drawer_count:
 *           type: integer
 *         is_left_right:
 *           type: boolean
 *         variants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductVariant'
 * 
 *     ProductVariant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         sku:
 *           type: string
 *         color_option:
 *           $ref: '#/components/schemas/ColorOption'
 *         pricing:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductPricing'
 * 
 *     ColorOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         display_name:
 *           type: string
 *         description:
 *           type: string
 * 
 *     ProductPricing:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         price:
 *           type: number
 *           format: decimal
 *         box_material:
 *           $ref: '#/components/schemas/BoxMaterial'
 * 
 *     BoxMaterial:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *         name:
 *           type: string
 * 
 * /api/v1/products/catalog:
 *   get:
 *     summary: Get product catalog
 *     tags: [Products]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search term
 *       - name: category_id
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [name, item_code, created_at, width, height]
 *         description: Sort field
 *       - name: order
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Product catalog retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 * 
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */