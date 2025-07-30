import { Router } from 'express';
import authRoutes from './auth';
import productRoutes from './products';
import customerRoutes from './customers';
import quoteRoutes from './quotes';
import adminRoutes from './admin';
import healthRoutes from './health';

const router = Router();

// Health check (no auth required)
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Product catalog routes
router.use('/products', productRoutes);

// Customer management routes
router.use('/customers', customerRoutes);

// Quote management routes
router.use('/quotes', quoteRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'Cabinet Quoting System API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/api/v1/health'
  });
});

export default router;