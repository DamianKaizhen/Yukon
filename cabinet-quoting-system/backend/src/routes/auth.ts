import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { body } from 'express-validator';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();
const authController = new AuthController();

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  validationMiddleware
];

// Registration validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('first_name').isLength({ min: 1, max: 100 }).trim(),
  body('last_name').isLength({ min: 1, max: 100 }).trim(),
  body('role').optional().isIn(['admin', 'sales', 'viewer']),
  validationMiddleware
];

// Profile update validation
const profileUpdateValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('first_name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 100 }).trim(),
  validationMiddleware
];

// Password change validation
const passwordChangeValidation = [
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  validationMiddleware
];

// Refresh token validation
const refreshValidation = [
  body('refreshToken').isLength({ min: 1 }),
  validationMiddleware
];

// Routes
router.post('/login', loginValidation, authController.login);
router.post('/register', requireAdmin, registerValidation, authController.register);
router.post('/refresh', refreshValidation, authController.refresh);
router.post('/logout', authenticate, authController.logout);

// Profile management
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, profileUpdateValidation, authController.updateProfile);
router.put('/me/password', authenticate, passwordChangeValidation, authController.changePassword);

// Token verification
router.get('/verify', authenticate, authController.verifyToken);
router.get('/permissions', authenticate, authController.getPermissions);

export default router;