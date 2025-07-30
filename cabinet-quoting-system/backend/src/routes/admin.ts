import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { requireAdmin } from '@/middleware/auth';
import multer from 'multer';
import path from 'path';
import { body } from 'express-validator';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();
const adminController = new AdminController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads/temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
  if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// User management validation
const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('first_name').isLength({ min: 1, max: 100 }).trim(),
  body('last_name').isLength({ min: 1, max: 100 }).trim(),
  body('role').isIn(['admin', 'sales', 'viewer']),
  validationMiddleware
];

const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('first_name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('role').optional().isIn(['admin', 'sales', 'viewer']),
  body('is_active').optional().isBoolean(),
  validationMiddleware
];

// All admin routes require admin access
router.use(requireAdmin);

// System information
router.get('/system/info', adminController.getSystemInfo);
router.get('/system/stats', adminController.getSystemStats);
router.get('/system/health', adminController.getSystemHealth);

// User management
router.get('/users', adminController.listUsers);
router.post('/users', createUserValidation, adminController.createUser);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', updateUserValidation, adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// CSV Import functionality
router.post('/import/products', upload.single('csvFile'), adminController.importProducts);
router.post('/import/customers', upload.single('csvFile'), adminController.importCustomers);
router.post('/import/pricing', upload.single('csvFile'), adminController.importPricing);
router.get('/import/history', adminController.getImportHistory);
router.get('/import/template/:type', adminController.getImportTemplate);

// Data export
router.get('/export/products', adminController.exportProducts);
router.get('/export/customers', adminController.exportCustomers);
router.get('/export/quotes', adminController.exportQuotes);

// Database operations
router.post('/database/backup', adminController.createBackup);
router.get('/database/backups', adminController.listBackups);
router.post('/database/restore/:backupId', adminController.restoreBackup);
router.post('/database/vacuum', adminController.vacuumDatabase);

// Logs and monitoring
router.get('/logs', adminController.getLogs);
router.get('/logs/errors', adminController.getErrorLogs);
router.delete('/logs', adminController.clearLogs);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemInfo:
 *       type: object
 *       properties:
 *         version:
 *           type: string
 *         environment:
 *           type: string
 *         uptime:
 *           type: number
 *         memory_usage:
 *           type: object
 *         database_status:
 *           type: string
 * 
 *     ImportResult:
 *       type: object
 *       properties:
 *         total_rows:
 *           type: integer
 *         imported_rows:
 *           type: integer
 *         failed_rows:
 *           type: integer
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *         warnings:
 *           type: array
 *           items:
 *             type: string
 * 
 * /api/v1/admin/system/info:
 *   get:
 *     summary: Get system information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SystemInfo'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * 
 * /api/v1/admin/import/products:
 *   post:
 *     summary: Import products from CSV
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing product data
 *     responses:
 *       200:
 *         description: Import completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ImportResult'
 *       400:
 *         description: Invalid file or format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */