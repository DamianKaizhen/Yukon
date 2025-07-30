import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'cabinet_system',
    user: process.env.DB_USER || 'cabinet_admin',
    password: process.env.DB_PASSWORD || '',
    schema: process.env.DB_SCHEMA || 'cabinet_system',
    ssl: process.env.NODE_ENV === 'production'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // API Security
  security: {
    rateLimitMax: parseInt(process.env.API_RATE_LIMIT || '100'),
    rateLimitWindowMs: parseInt(process.env.API_WINDOW_MS || '900000'), // 15 minutes
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    bcryptRounds: 12
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: ['text/csv', 'application/vnd.ms-excel'],
    uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads')
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  
  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  
  // CSV Import
  csv: {
    batchSize: parseInt(process.env.CSV_BATCH_SIZE || '1000'),
    maxRows: parseInt(process.env.CSV_MAX_ROWS || '50000')
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 100,
    maxLimit: 100
  }
};

// Validation
if (!config.jwt.secret || config.jwt.secret === 'your_jwt_secret_key') {
  console.warn('⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable.');
}

if (!config.database.password && config.nodeEnv === 'production') {
  throw new Error('DB_PASSWORD must be set in production environment');
}

export default config;