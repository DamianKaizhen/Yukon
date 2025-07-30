import { Router } from 'express';
import { CustomerController } from '@/controllers/CustomerController';
import { authenticate, requireSales, requireAdmin } from '@/middleware/auth';
import { body, param, query } from 'express-validator';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();
const customerController = new CustomerController();

// Validation middleware
const createCustomerValidation = [
  body('first_name').isLength({ min: 1, max: 100 }).trim(),
  body('last_name').isLength({ min: 1, max: 100 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('company_name').optional().isLength({ min: 1, max: 200 }).trim(),
  body('phone').optional().isLength({ min: 1, max: 20 }),
  body('address_line1').optional().isLength({ min: 1, max: 255 }),
  body('address_line2').optional().isLength({ min: 1, max: 255 }),
  body('city').optional().isLength({ min: 1, max: 100 }),
  body('state_province').optional().isLength({ min: 1, max: 100 }),
  body('postal_code').optional().isLength({ min: 1, max: 20 }),
  body('country').optional().isLength({ min: 1, max: 100 }),
  body('notes').optional().isLength({ max: 1000 }),
  validationMiddleware
];

const updateCustomerValidation = [
  body('first_name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('company_name').optional().isLength({ min: 1, max: 200 }).trim(),
  body('phone').optional().isLength({ min: 1, max: 20 }),
  body('address_line1').optional().isLength({ min: 1, max: 255 }),
  body('address_line2').optional().isLength({ min: 1, max: 255 }),
  body('city').optional().isLength({ min: 1, max: 100 }),
  body('state_province').optional().isLength({ min: 1, max: 100 }),
  body('postal_code').optional().isLength({ min: 1, max: 20 }),
  body('country').optional().isLength({ min: 1, max: 100 }),
  body('notes').optional().isLength({ max: 1000 }),
  validationMiddleware
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 2, max: 100 }),
  query('sort').optional().isIn(['first_name', 'last_name', 'company_name', 'email', 'created_at']),
  query('order').optional().isIn(['asc', 'desc']),
  validationMiddleware
];

const searchValidation = [
  query('q').isLength({ min: 2, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validationMiddleware
];

const uuidValidation = [
  param('id').isUUID(),
  validationMiddleware
];

const emailValidation = [
  param('email').isEmail(),
  validationMiddleware
];

// All customer routes require authentication
router.use(authenticate);

// Customer CRUD operations (Sales and Admin)
router.post('/', requireSales, createCustomerValidation, customerController.createCustomer);
router.get('/', requireSales, listValidation, customerController.listCustomers);
router.get('/search', requireSales, searchValidation, customerController.searchCustomers);
router.get('/location', requireSales, customerController.getCustomersByLocation);

// Individual customer operations
router.get('/:id', requireSales, uuidValidation, customerController.getCustomer);
router.put('/:id', requireSales, uuidValidation, updateCustomerValidation, customerController.updateCustomer);
router.delete('/:id', requireAdmin, uuidValidation, customerController.deleteCustomer);

// Customer lookup operations
router.get('/email/:email', requireSales, emailValidation, customerController.getCustomerByEmail);
router.get('/number/:number', requireSales, customerController.getCustomerByNumber);
router.get('/email/:email/check', requireSales, emailValidation, customerController.checkEmail);

// Customer analytics
router.get('/:id/statistics', requireSales, uuidValidation, customerController.getCustomerStatistics);
router.get('/:id/activity', requireSales, uuidValidation, customerController.getCustomerActivity);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - email
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           readOnly: true
 *         customer_number:
 *           type: string
 *           readOnly: true
 *         company_name:
 *           type: string
 *           maxLength: 200
 *         first_name:
 *           type: string
 *           maxLength: 100
 *         last_name:
 *           type: string
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           maxLength: 20
 *         address_line1:
 *           type: string
 *           maxLength: 255
 *         address_line2:
 *           type: string
 *           maxLength: 255
 *         city:
 *           type: string
 *           maxLength: 100
 *         state_province:
 *           type: string
 *           maxLength: 100
 *         postal_code:
 *           type: string
 *           maxLength: 20
 *         country:
 *           type: string
 *           maxLength: 100
 *         notes:
 *           type: string
 *           maxLength: 1000
 *         is_active:
 *           type: boolean
 *           readOnly: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updated_at:
 *           type: string
 *           format: date-time
 *           readOnly: true
 * 
 *     CustomerStatistics:
 *       type: object
 *       properties:
 *         customer_id:
 *           type: string
 *           format: uuid
 *         total_quotes:
 *           type: integer
 *         approved_quotes:
 *           type: integer
 *         total_quote_value:
 *           type: number
 *           format: decimal
 *         last_quote_date:
 *           type: string
 *           format: date-time
 * 
 * /api/v1/customers:
 *   get:
 *     summary: List customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
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
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [first_name, last_name, company_name, email, created_at]
 *         description: Sort field
 *       - name: order
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
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
 *                         $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *             properties:
 *               company_name:
 *                 type: string
 *                 maxLength: 200
 *               first_name:
 *                 type: string
 *                 maxLength: 100
 *               last_name:
 *                 type: string
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               address_line1:
 *                 type: string
 *                 maxLength: 255
 *               address_line2:
 *                 type: string
 *                 maxLength: 255
 *               city:
 *                 type: string
 *                 maxLength: 100
 *               state_province:
 *                 type: string
 *                 maxLength: 100
 *               postal_code:
 *                 type: string
 *                 maxLength: 20
 *               country:
 *                 type: string
 *                 maxLength: 100
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */