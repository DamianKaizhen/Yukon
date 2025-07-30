import { Request, Response, NextFunction } from 'express';
import { checkSchema, validationResult, Schema } from 'express-validator';
import { ValidationError, APIResponse } from '@/types';
import { Logger } from '@/utils/Logger';

const logger = Logger.getInstance();

/**
 * Create validation middleware from schema
 */
export const validationMiddleware = (schema: Schema) => {
  return [
    checkSchema(schema),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => 
          `${error.param}: ${error.msg}`
        );
        
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: errorMessages,
          body: req.body
        });
        
        const response: APIResponse = {
          success: false,
          message: 'Validation failed',
          errors: errorMessages,
          meta: {
            error_code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString()
          }
        };
        
        res.status(400).json(response);
        return;
      }
      
      next();
    }
  ];
};

/**
 * Custom validation functions
 */
export const customValidators = {
  /**
   * Validate UUID format
   */
  isValidUUID: (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Validate positive number
   */
  isPositiveNumber: (value: number) => {
    return typeof value === 'number' && value > 0;
  },

  /**
   * Validate percentage (0-100)
   */
  isValidPercentage: (value: number) => {
    return typeof value === 'number' && value >= 0 && value <= 100;
  },

  /**
   * Validate currency amount
   */
  isValidCurrency: (value: number) => {
    return typeof value === 'number' && value >= 0 && Number.isFinite(value);
  },

  /**
   * Validate quote items array
   */
  isValidQuoteItems: (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }

    items.forEach((item, index) => {
      if (!item.product_variant_id || !customValidators.isValidUUID(item.product_variant_id)) {
        throw new Error(`Item ${index + 1}: Invalid product variant ID`);
      }
      
      if (!item.box_material_id || !customValidators.isValidUUID(item.box_material_id)) {
        throw new Error(`Item ${index + 1}: Invalid box material ID`);
      }
      
      if (!customValidators.isPositiveNumber(item.quantity)) {
        throw new Error(`Item ${index + 1}: Quantity must be a positive number`);
      }

      if (item.quantity > 1000) {
        throw new Error(`Item ${index + 1}: Quantity cannot exceed 1000`);
      }
      
      if (item.discount_percent !== undefined && !customValidators.isValidPercentage(item.discount_percent)) {
        throw new Error(`Item ${index + 1}: Discount percent must be between 0 and 100`);
      }
      
      if (item.custom_price !== undefined && !customValidators.isValidCurrency(item.custom_price)) {
        throw new Error(`Item ${index + 1}: Custom price must be a valid currency amount`);
      }
    });
    
    return true;
  },

  /**
   * Validate shipping address
   */
  isValidShippingAddress: (address: any) => {
    if (!address || typeof address !== 'object') {
      return true; // Optional field
    }

    const required = ['address_line1', 'city', 'state_province', 'postal_code'];
    
    for (const field of required) {
      if (!address[field] || typeof address[field] !== 'string' || address[field].trim() === '') {
        throw new Error(`Shipping address ${field} is required`);
      }
    }

    // Validate postal code format (basic validation)
    if (!/^[\w\s-]{3,10}$/.test(address.postal_code)) {
      throw new Error('Invalid postal code format');
    }

    // Validate state/province (2-3 character code)
    if (!/^[A-Z]{2,3}$/.test(address.state_province.toUpperCase())) {
      throw new Error('State/province must be a 2-3 character code');
    }

    return true;
  },

  /**
   * Validate custom branding object
   */
  isValidCustomBranding: (branding: any) => {
    if (!branding || typeof branding !== 'object') {
      return true; // Optional field
    }

    if (branding.company_name && typeof branding.company_name !== 'string') {
      throw new Error('Company name must be a string');
    }

    if (branding.logo_url && typeof branding.logo_url !== 'string') {
      throw new Error('Logo URL must be a string');
    }

    if (branding.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(branding.primary_color)) {
      throw new Error('Primary color must be a valid hex color');
    }

    if (branding.accent_color && !/^#[0-9A-Fa-f]{6}$/.test(branding.accent_color)) {
      throw new Error('Accent color must be a valid hex color');
    }

    if (branding.font_family && typeof branding.font_family !== 'string') {
      throw new Error('Font family must be a string');
    }

    return true;
  },

  /**
   * Validate date is in the future
   */
  isFutureDate: (value: string) => {
    const date = new Date(value);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (date <= now) {
      throw new Error('Date must be in the future');
    }
    
    return true;
  },

  /**
   * Validate date is within reasonable range (e.g., within 1 year)
   */
  isWithinRange: (value: string, maxDays: number = 365) => {
    const date = new Date(value);
    const now = new Date();
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    if (date > maxDate) {
      throw new Error(`Date cannot be more than ${maxDays} days in the future`);
    }
    
    return true;
  }
};

/**
 * Sanitize request body
 */
export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remove null and undefined values
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Skip null/undefined values
      if (value !== null && value !== undefined) {
        // Trim strings
        if (typeof value === 'string') {
          sanitized[key] = value.trim();
        } else {
          sanitized[key] = sanitizeObject(value);
        }
      }
    });
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Request size validation middleware
 */
export const requestSizeMiddleware = (maxSize: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request too large', {
        path: req.path,
        method: req.method,
        contentLength,
        maxSize
      });
      
      const response: APIResponse = {
        success: false,
        message: 'Request body too large',
        errors: [`Request size ${contentLength} bytes exceeds maximum ${maxSize} bytes`],
        meta: {
          error_code: 'REQUEST_TOO_LARGE',
          timestamp: new Date().toISOString()
        }
      };
      
      res.status(413).json(response);
      return;
    }
    
    next();
  };
};

/**
 * Content type validation middleware
 */
export const contentTypeMiddleware = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('content-type');
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        logger.warn('Invalid content type', {
          path: req.path,
          method: req.method,
          contentType,
          allowedTypes
        });
        
        const response: APIResponse = {
          success: false,
          message: 'Invalid content type',
          errors: [`Content-Type must be one of: ${allowedTypes.join(', ')}`],
          meta: {
            error_code: 'INVALID_CONTENT_TYPE',
            timestamp: new Date().toISOString()
          }
        };
        
        res.status(415).json(response);
        return;
      }
    }
    
    next();
  };
};