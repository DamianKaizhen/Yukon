import dotenv from 'dotenv';
import path from 'path';
import { 
  QuoteEngineConfig, 
  ServerConfig, 
  DatabaseConfig, 
  EmailConfig, 
  PDFConfig, 
  BusinessConfig, 
  LoggingConfig, 
  SecurityConfig,
  ConfigurationError 
} from '@/types';

// Load environment variables
dotenv.config();

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: QuoteEngineConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public getConfig(): QuoteEngineConfig {
    return this.config;
  }

  public getServerConfig(): ServerConfig {
    return this.config.server;
  }

  public getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  public getEmailConfig(): EmailConfig {
    return this.config.email;
  }

  public getPDFConfig(): PDFConfig {
    return this.config.pdf;
  }

  public getBusinessConfig(): BusinessConfig {
    return this.config.business;
  }

  public getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  public getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  private loadConfiguration(): QuoteEngineConfig {
    const server: ServerConfig = {
      port: parseInt(process.env.PORT || '3002'),
      host: process.env.HOST || '0.0.0.0',
      api_version: process.env.API_VERSION || 'v1',
      cors_origins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      rate_limit: parseInt(process.env.API_RATE_LIMIT || '1000')
    };

    const database: DatabaseConfig = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'cabinet_quoting',
      user: process.env.DATABASE_USER || 'cabinet_user',
      password: process.env.DATABASE_PASSWORD || 'cabinet_password',
      schema: process.env.DATABASE_SCHEMA || 'public',
      ssl: process.env.DATABASE_SSL === 'true',
      max_connections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
      idle_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connection_timeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000')
    };

    const email: EmailConfig = {
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_secure: process.env.SMTP_SECURE === 'true',
      smtp_user: process.env.SMTP_USER || '',
      smtp_password: process.env.SMTP_PASSWORD || '',
      from_name: process.env.EMAIL_FROM_NAME || 'Yudezign',
      from_address: process.env.EMAIL_FROM_ADDRESS || 'quotes@yudezign.com'
    };

    const pdf: PDFConfig = {
      storage_path: path.resolve(process.env.PDF_STORAGE_PATH || './storage/pdfs'),
      temp_path: path.resolve(process.env.PDF_TEMP_PATH || './storage/temp'),
      company_logo_path: path.resolve(process.env.COMPANY_LOGO_PATH || './assets/logo.png'),
      max_file_size: parseInt(process.env.PDF_MAX_FILE_SIZE || '10485760'), // 10MB
      retention_days: parseInt(process.env.PDF_RETENTION_DAYS || '90')
    };

    const business: BusinessConfig = {
      default_tax_rate: parseFloat(process.env.DEFAULT_TAX_RATE || '0.0875'),
      default_quote_validity_days: parseInt(process.env.DEFAULT_QUOTE_VALIDITY_DAYS || '30'),
      min_order_amount: parseFloat(process.env.MIN_ORDER_AMOUNT || '100.00'),
      bulk_discount_threshold: parseFloat(process.env.BULK_DISCOUNT_THRESHOLD || '10000.00'),
      bulk_discount_percentage: parseFloat(process.env.BULK_DISCOUNT_PERCENTAGE || '5.0'),
      regional_tax_rates: this.parseRegionalTaxRates(process.env.REGIONAL_TAX_RATES)
    };

    const logging: LoggingConfig = {
      level: process.env.LOG_LEVEL || 'info',
      file_path: path.resolve(process.env.LOG_FILE_PATH || './logs/quote-engine.log'),
      max_size: process.env.LOG_MAX_SIZE || '10m',
      max_files: parseInt(process.env.LOG_MAX_FILES || '5')
    };

    const security: SecurityConfig = {
      jwt_secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
      backend_api_key: process.env.BACKEND_API_KEY || '',
      api_rate_limit: parseInt(process.env.API_RATE_LIMIT || '1000')
    };

    return {
      server,
      database,
      email,
      pdf,
      business,
      logging,
      security
    };
  }

  private parseRegionalTaxRates(taxRatesJson?: string): Record<string, number> {
    if (!taxRatesJson) {
      return {
        'CA': 0.0875,
        'NY': 0.08,
        'TX': 0.0625,
        'FL': 0.06
      };
    }

    try {
      return JSON.parse(taxRatesJson);
    } catch (error) {
      console.warn('Failed to parse REGIONAL_TAX_RATES, using defaults:', error);
      return {
        'CA': 0.0875,
        'NY': 0.08,
        'TX': 0.0625,
        'FL': 0.06
      };
    }
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate required fields
    if (!this.config.database.host) {
      errors.push('DATABASE_HOST is required');
    }

    if (!this.config.database.database) {
      errors.push('DATABASE_NAME is required');
    }

    if (!this.config.database.user) {
      errors.push('DATABASE_USER is required');
    }

    if (!this.config.database.password) {
      errors.push('DATABASE_PASSWORD is required');
    }

    if (!this.config.email.smtp_user && process.env.NODE_ENV === 'production') {
      errors.push('SMTP_USER is required in production');
    }

    if (!this.config.email.smtp_password && process.env.NODE_ENV === 'production') {
      errors.push('SMTP_PASSWORD is required in production');
    }

    if (!this.config.security.jwt_secret || this.config.security.jwt_secret === 'your-jwt-secret-key') {
      if (process.env.NODE_ENV === 'production') {
        errors.push('JWT_SECRET must be set to a secure value in production');
      }
    }

    // Validate numeric ranges
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }

    if (this.config.database.port < 1 || this.config.database.port > 65535) {
      errors.push('DATABASE_PORT must be between 1 and 65535');
    }

    if (this.config.business.default_tax_rate < 0 || this.config.business.default_tax_rate > 1) {
      errors.push('DEFAULT_TAX_RATE must be between 0 and 1');
    }

    if (this.config.business.min_order_amount < 0) {
      errors.push('MIN_ORDER_AMOUNT must be positive');
    }

    if (this.config.business.bulk_discount_percentage < 0 || this.config.business.bulk_discount_percentage > 100) {
      errors.push('BULK_DISCOUNT_PERCENTAGE must be between 0 and 100');
    }

    // Validate business logic
    if (this.config.business.bulk_discount_threshold <= this.config.business.min_order_amount) {
      errors.push('BULK_DISCOUNT_THRESHOLD must be greater than MIN_ORDER_AMOUNT');
    }

    if (errors.length > 0) {
      throw new ConfigurationError(
        `Configuration validation failed: ${errors.join(', ')}`,
        { errors }
      );
    }
  }

  // Utility methods for runtime configuration updates
  public updateBusinessRules(updates: Partial<BusinessConfig>): void {
    this.config.business = { ...this.config.business, ...updates };
    this.validateConfiguration();
  }

  public getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  public isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  public isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  public isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  // Get backend API URL with version
  public getBackendApiUrl(endpoint?: string): string {
    const baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api/v1';
    return endpoint ? `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}` : baseUrl;
  }

  // Health check configuration
  public getHealthCheckConfig() {
    return {
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      metrics_enabled: process.env.METRICS_ENABLED === 'true'
    };
  }
}

// Export singleton instance
export const config = ConfigurationManager.getInstance();
export default config;