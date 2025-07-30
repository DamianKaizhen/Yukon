import { Router } from 'express';
import { QuoteController } from '@/controllers/QuoteController';
import { authenticate, requireSales, requireAdmin } from '@/middleware/auth';
import { body, param, query } from 'express-validator';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();
const quoteController = new QuoteController();

// Validation middleware
const createQuoteValidation = [
  body('customer_id').isUUID(),
  body('valid_until').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
  body('items').isArray({ min: 1 }),
  body('items.*.product_variant_id').isUUID(),
  body('items.*.box_material_id').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('items.*.notes').optional().isLength({ max: 500 }),
  validationMiddleware
];

const updateQuoteValidation = [
  body('customer_id').optional().isUUID(),
  body('status').optional().isIn(['draft', 'sent', 'approved', 'rejected', 'expired']),
  body('valid_until').optional().isISO8601(),
  body('notes').optional().isLength({ max: 1000 }),
  body('approved_by').optional().isUUID(),
  validationMiddleware
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 2, max: 100 }),
  query('customer_id').optional().isUUID(),
  query('status').optional().isIn(['draft', 'sent', 'approved', 'rejected', 'expired']),
  query('created_by').optional().isUUID(),
  query('sort').optional().isIn(['created_at', 'quote_number', 'total_amount', 'valid_until']),
  query('order').optional().isIn(['asc', 'desc']),
  validationMiddleware
];

const uuidValidation = [
  param('id').isUUID(),
  validationMiddleware
];

// All quote routes require authentication
router.use(authenticate);

// Quote CRUD operations (Sales and Admin)
router.post('/', requireSales, createQuoteValidation, quoteController.createQuote);
router.get('/', requireSales, listValidation, quoteController.listQuotes);
router.get('/:id', requireSales, uuidValidation, quoteController.getQuote);
router.put('/:id', requireSales, uuidValidation, updateQuoteValidation, quoteController.updateQuote);
router.delete('/:id', requireAdmin, uuidValidation, quoteController.deleteQuote);

// Quote operations
router.post('/:id/duplicate', requireSales, uuidValidation, quoteController.duplicateQuote);
router.post('/:id/send', requireSales, uuidValidation, quoteController.sendQuote);
router.post('/:id/approve', requireSales, uuidValidation, quoteController.approveQuote);
router.post('/:id/reject', requireSales, uuidValidation, quoteController.rejectQuote);
router.post('/:id/recalculate', requireSales, uuidValidation, quoteController.recalculateTotals);

// Quote exports
router.get('/:id/pdf', requireSales, uuidValidation, quoteController.exportPdf);
router.get('/:id/excel', requireSales, uuidValidation, quoteController.exportExcel);

export default router;