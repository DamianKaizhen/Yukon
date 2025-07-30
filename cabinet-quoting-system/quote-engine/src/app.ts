import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from '@/config';
import { Logger } from '@/utils/Logger';
import { globalRateLimit } from '@/middleware/rateLimit';
import { contentTypeMiddleware, requestSizeMiddleware, sanitizeMiddleware } from '@/middleware/validation';
import { APIResponse, QuoteEngineError } from '@/types';

import apiRoutes from '@/routes';

const logger = Logger.getInstance();

class QuoteEngineApp {
  public app: express.Application;
  private serverConfig: any;

  constructor() {
    this.app = express();
    this.serverConfig = config.getServerConfig();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
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
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.serverConfig.cors_origins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Correlation-ID'
      ],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));

    // Compression
    this.app.use(compression({
      level: 6,
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info('HTTP Request', { message: message.trim() });
        }
      }
    }));

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
      type: 'application/json'
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Custom middleware
    this.app.use(requestSizeMiddleware(10 * 1024 * 1024)); // 10MB limit
    this.app.use(contentTypeMiddleware(['application/json']));
    this.app.use(sanitizeMiddleware);

    // Global rate limiting
    this.app.use(globalRateLimit);

    // Request ID middleware
    this.app.use((req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] as string || 
                           `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      req.headers['x-correlation-id'] = correlationId;
      res.setHeader('X-Correlation-ID', correlationId);
      
      next();
    });

    // Request timing middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.performance('http_request', duration, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          correlationId: req.headers['x-correlation-id']
        });
      });
      
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoint (before API versioning)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'quote-engine',
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use(`/api/${this.serverConfig.api_version}`, apiRoutes);

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      const response: APIResponse = {
        success: false,
        message: 'Route not found',
        errors: [`The requested route ${req.method} ${req.originalUrl} was not found`],
        meta: {
          error_code: 'ROUTE_NOT_FOUND',
          timestamp: new Date().toISOString()
        }
      };

      res.status(404).json(response);
    });
  }

  /**
   * Initialize Swagger documentation
   */
  private initializeSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Quote Engine API',
          version: '1.0.0',
          description: 'Cabinet Quote Processing and PDF Generation Service',
          contact: {
            name: 'Yudezign Development Team',
            email: 'dev@yudezign.com'
          }
        },
        servers: [
          {
            url: `http://localhost:${this.serverConfig.port}/api/${this.serverConfig.api_version}`,
            description: 'Development server'
          }
        ],
        components: {
          schemas: {
            QuoteCalculationRequest: {
              type: 'object',
              required: ['customer_id', 'items'],
              properties: {
                customer_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Customer ID'
                },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['product_variant_id', 'box_material_id', 'quantity'],
                    properties: {
                      product_variant_id: { type: 'string', format: 'uuid' },
                      box_material_id: { type: 'string', format: 'uuid' },
                      quantity: { type: 'number', minimum: 1 },
                      discount_percent: { type: 'number', minimum: 0, maximum: 100 },
                      custom_price: { type: 'number', minimum: 0 },
                      notes: { type: 'string' }
                    }
                  }
                },
                shipping_address: {
                  type: 'object',
                  properties: {
                    address_line1: { type: 'string' },
                    address_line2: { type: 'string' },
                    city: { type: 'string' },
                    state_province: { type: 'string' },
                    postal_code: { type: 'string' },
                    country: { type: 'string' }
                  }
                },
                apply_tax: { type: 'boolean' },
                customer_discount_tier: {
                  type: 'string',
                  enum: ['retail', 'contractor', 'dealer', 'wholesale']
                },
                notes: { type: 'string' },
                valid_until: { type: 'string', format: 'date-time' }
              }
            },
            PDFGenerationRequest: {
              type: 'object',
              required: ['quote_calculation'],
              properties: {
                quote_calculation: {
                  type: 'object',
                  description: 'Complete quote calculation object'
                },
                template_type: {
                  type: 'string',
                  enum: ['standard', 'detailed', 'summary', 'contractor'],
                  default: 'standard'
                },
                include_terms: { type: 'boolean', default: true },
                include_installation_guide: { type: 'boolean', default: false },
                custom_branding: {
                  type: 'object',
                  properties: {
                    company_name: { type: 'string' },
                    logo_url: { type: 'string' },
                    primary_color: { type: 'string' },
                    accent_color: { type: 'string' },
                    font_family: { type: 'string' }
                  }
                },
                watermark: { type: 'string' }
              }
            }
          }
        }
      },
      apis: ['./src/routes/*.ts'], // Path to the API files
    };

    const swaggerSpec = swaggerJSDoc(swaggerOptions);

    // Serve swagger docs
    this.app.use(`/api/${this.serverConfig.api_version}/docs`, 
      swaggerUi.serve, 
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Quote Engine API Documentation'
      })
    );

    // Serve swagger JSON
    this.app.get(`/api/${this.serverConfig.api_version}/docs.json`, (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string;
      
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        correlationId
      });

      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let message = 'Internal server error';

      if (error instanceof QuoteEngineError) {
        statusCode = error.statusCode;
        errorCode = error.errorCode;
        message = error.message;
      } else if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
      }

      const response: APIResponse = {
        success: false,
        message,
        errors: [message],
        meta: {
          error_code: errorCode,
          correlation_id: correlationId,
          timestamp: new Date().toISOString()
        }
      };

      res.status(statusCode).json(response);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
      process.exit(1);
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

  /**
   * Start the server
   */
  public listen(): void {
    const port = this.serverConfig.port;
    const host = this.serverConfig.host;

    this.app.listen(port, host, () => {
      logger.info('Quote Engine started successfully', {
        port,
        host,
        environment: config.getEnvironment(),
        api_version: this.serverConfig.api_version,
        docs_url: `http://${host}:${port}/api/${this.serverConfig.api_version}/docs`
      });
    });
  }
}

export default QuoteEngineApp;