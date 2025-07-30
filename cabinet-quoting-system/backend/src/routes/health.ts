import { Router, Request, Response } from 'express';
import database from '@/config/database';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const healthCheck = {
      uptime: process.uptime(),
      message: 'OK',
      timestamp: Date.now(),
      service: 'Cabinet Quoting System API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    ResponseHelper.success(res, healthCheck, 'Service is healthy');
  } catch (error) {
    logger.error('Health check failed', error);
    ResponseHelper.serverError(res, 'Health check failed');
  }
});

/**
 * Detailed health check with database connectivity
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbHealthy = await database.healthCheck();
    const dbResponseTime = Date.now() - startTime;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    const healthCheck = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      service: 'Cabinet Quoting System API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          response_time_ms: dbResponseTime
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
        },
        system: {
          platform: process.platform,
          arch: process.arch,
          node_version: process.version,
          pid: process.pid
        }
      }
    };
    
    if (dbHealthy) {
      ResponseHelper.success(res, healthCheck, 'All systems healthy');
    } else {
      ResponseHelper.error(res, 'Database connectivity issues detected', 503, ['Database connection failed']);
    }
  } catch (error) {
    logger.error('Detailed health check failed', error);
    ResponseHelper.serverError(res, 'Health check failed');
  }
});

/**
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealthy = await database.healthCheck();
    
    if (dbHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({ status: 'not ready', reason: 'service error' });
  }
});

/**
 * Liveness probe (for Kubernetes)
 */
router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({ status: 'alive' });
});

export default router;