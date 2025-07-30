import { Router, Request, Response } from 'express';
import { APIResponse } from '@/types';
import { Logger } from '@/utils/Logger';
import { BackendApiService } from '@/services/BackendApiService';
import { config } from '@/config';
import { getRateLimitStats } from '@/middleware/rateLimit';

const router = Router();
const logger = Logger.getInstance();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [ok]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
router.get('/', (req: Request, res: Response) => {
  const response: APIResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    },
    message: 'Quote Engine is healthy'
  };

  res.status(200).json(response);
});

/**
 * @swagger
 * /api/v1/health/detailed:
 *   get:
 *     summary: Detailed health check with dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     dependencies:
 *                       type: object
 *                     configuration:
 *                       type: object
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check backend API health
    const backendService = new BackendApiService();
    const backendHealthy = await backendService.healthCheck();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get system info
    const systemInfo = {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      pid: process.pid
    };
    
    // Get configuration status
    const configStatus = {
      environment: config.getEnvironment(),
      log_level: logger.getLogLevel(),
      pdf_storage_configured: !!config.getPDFConfig().storage_path,
      email_configured: !!config.getEmailConfig().smtp_host
    };
    
    // Get rate limiting stats
    const rateLimitStats = getRateLimitStats();
    
    const healthCheckDuration = Date.now() - startTime;
    
    const response: APIResponse = {
      success: true,
      data: {
        status: backendHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heap_used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heap_total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024) // MB
        },
        system: systemInfo,
        dependencies: {
          backend_api: {
            status: backendHealthy ? 'healthy' : 'unhealthy',
            url: config.getBackendApiUrl()
          }
        },
        configuration: configStatus,
        rate_limiting: rateLimitStats,
        health_check_duration_ms: healthCheckDuration
      },
      message: backendHealthy ? 'All systems operational' : 'Some dependencies are unhealthy'
    };

    const statusCode = backendHealthy ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Health check failed', { error });
    
    const response: APIResponse = {
      success: false,
      data: {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      message: 'Health check failed',
      errors: [error.message]
    };

    res.status(503).json(response);
  }
});

/**
 * @swagger
 * /api/v1/health/ready:
 *   get:
 *     summary: Readiness check for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to accept requests
    const backendService = new BackendApiService();
    const backendHealthy = await backendService.healthCheck();
    
    // Check critical configuration
    const pdfConfig = config.getPDFConfig();
    const storageConfigured = !!pdfConfig.storage_path;
    
    const isReady = backendHealthy && storageConfigured;
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          backend_api: backendHealthy,
          storage_configured: storageConfigured
        }
      });
    }

  } catch (error) {
    logger.error('Readiness check failed', { error });
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/health/live:
 *   get:
 *     summary: Liveness check for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *       503:
 *         description: Service should be restarted
 */
router.get('/live', (req: Request, res: Response) => {
  try {
    // Basic liveness check - if we can respond, we're alive
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Check for memory leaks (basic check)
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const isMemoryHealthy = heapUsedMB < 512; // Alert if using more than 512MB
    
    if (isMemoryHealthy) {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime,
        memory_mb: Math.round(heapUsedMB)
      });
    } else {
      res.status(503).json({
        status: 'memory_warning',
        timestamp: new Date().toISOString(),
        uptime,
        memory_mb: Math.round(heapUsedMB)
      });
    }

  } catch (error) {
    logger.error('Liveness check failed', { error });
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/health/metrics:
 *   get:
 *     summary: Get service metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const rateLimitStats = getRateLimitStats();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      memory: {
        rss_bytes: memoryUsage.rss,
        heap_used_bytes: memoryUsage.heapUsed,
        heap_total_bytes: memoryUsage.heapTotal,
        external_bytes: memoryUsage.external
      },
      cpu: {
        user_microseconds: cpuUsage.user,
        system_microseconds: cpuUsage.system
      },
      process: {
        pid: process.pid,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      rate_limiting: rateLimitStats,
      environment: {
        node_env: process.env.NODE_ENV,
        log_level: logger.getLogLevel()
      }
    };

    const response: APIResponse = {
      success: true,
      data: metrics,
      message: 'Metrics retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Metrics collection failed', { error });
    
    const response: APIResponse = {
      success: false,
      message: 'Failed to collect metrics',
      errors: [error.message]
    };

    res.status(500).json(response);
  }
});

export default router;