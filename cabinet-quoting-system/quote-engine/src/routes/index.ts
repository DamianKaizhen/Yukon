import { Router } from 'express';
import quotesRouter from './quotes';
import pdfsRouter from './pdfs';
import healthRouter from './health';

const router = Router();

// Mount sub-routes
router.use('/quotes', quotesRouter);
router.use('/pdfs', pdfsRouter);
router.use('/health', healthRouter);

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Quote Engine API v1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      quotes: '/api/v1/quotes',
      pdfs: '/api/v1/pdfs',
      health: '/api/v1/health',
      docs: '/api/v1/docs'
    }
  });
});

export default router;