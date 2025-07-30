import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import config from './config';
import { logger } from './utils/logger';
import { ResponseHelper } from './utils/response';
import { APIError } from './types';

// Import routes
import routes from './routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupSwagger();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMax,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        errors: ['Rate limit exceeded']
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.nodeEnv !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim())
        }
      }));
    }

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        Math.random().toString(36).substring(2, 15);
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });

    // Trust proxy for accurate client IP
    this.app.set('trust proxy', 1);
  }

  private setupSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Cabinet Quoting System API',
          version: '1.0.0',
          description: 'RESTful API for the Cabinet Quoting System',
          contact: {
            name: 'API Support',
            email: 'support@cabinet-system.com'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: [
          {
            url: `http://localhost:${config.port}${config.apiPrefix}`,
            description: 'Development server'
          },
          {
            url: `https://api.cabinet-system.com${config.apiPrefix}`,
            description: 'Production server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          },
          schemas: {
            Error: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
                errors: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            ApiResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'object' },
                message: { type: 'string' },
                meta: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    pages: { type: 'number' }
                  }
                }
              }
            }
          }
        },
        security: [
          { bearerAuth: [] }
        ]
      },
      apis: [
        path.join(__dirname, './routes/*.ts'),
        path.join(__dirname, './controllers/*.ts')
      ]
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Cabinet Quoting System API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
      }
    }));

    // Serve swagger spec as JSON
    this.app.get('/swagger.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use(config.apiPrefix, routes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Cabinet Quoting System API',
        version: '1.0.0',
        description: 'RESTful API for cabinet quoting and management',
        endpoints: {
          api: config.apiPrefix,
          docs: '/docs',
          health: `${config.apiPrefix}/health`,
          swagger: '/swagger.json'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Handle 404 for API routes
    this.app.use(config.apiPrefix + '/*', (req: Request, res: Response) => {
      ResponseHelper.notFound(res, `API endpoint not found: ${req.method} ${req.path}`);
    });

    // Handle 404 for all other routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        suggestion: `Try visiting ${config.apiPrefix} for API endpoints or /docs for documentation`
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.headers['x-request-id']
      });

      // Handle API errors
      if (error instanceof APIError) {
        ResponseHelper.error(res, error.message, error.statusCode);
        return;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        ResponseHelper.validationError(res, error.message);
        return;
      }

      // Handle database errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        ResponseHelper.error(res, 'Database connection error', 503);
        return;
      }

      // Handle JWT errors
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        ResponseHelper.unauthorized(res, 'Invalid or expired token');
        return;
      }

      // Default server error
      ResponseHelper.serverError(res, 
        config.nodeEnv === 'development' ? error.message : 'Internal server error'
      );
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;