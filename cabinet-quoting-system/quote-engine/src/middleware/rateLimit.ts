import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '@/types';
import { Logger } from '@/utils/Logger';

const logger = Logger.getInstance();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// In production, you might want to use Redis for distributed systems
const store: RateLimitStore = {};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Clean up expired entries
      cleanupExpiredEntries(now);
      
      // Get or create entry for this key
      if (!store[key]) {
        store[key] = {
          count: 0,
          resetTime: now + windowMs
        };
      }
      
      const entry = store[key];
      
      // Reset counter if window has expired
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + windowMs;
      }
      
      // Check if limit exceeded
      if (entry.count >= max) {
        logger.warn('Rate limit exceeded', {
          key,
          count: entry.count,
          max,
          windowMs,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        const response: APIResponse = {
          success: false,
          message,
          errors: [`Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds.`],
          meta: {
            error_code: 'RATE_LIMIT_EXCEEDED',
            retry_after: Math.ceil((entry.resetTime - now) / 1000),
            timestamp: new Date().toISOString()
          }
        };
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
        });
        
        res.status(429).json(response);
        return;
      }
      
      // Increment counter
      entry.count++;
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - entry.count).toString(),
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
      });
      
      // Handle response counting
      if (!skipSuccessfulRequests || !skipFailedRequests) {
        const originalSend = res.json;
        
        res.json = function(body: any) {
          const statusCode = res.statusCode;
          
          // Decrement counter if we should skip this type of request
          if ((skipSuccessfulRequests && statusCode < 400) ||
              (skipFailedRequests && statusCode >= 400)) {
            entry.count--;
          }
          
          return originalSend.call(this, body);
        };
      }
      
      next();
      
    } catch (error) {
      logger.error('Rate limiting error', { error, path: req.path });
      next(); // Continue on error, don't block requests
    }
  };
};

/**
 * Default key generator (IP-based)
 */
function defaultKeyGenerator(req: Request): string {
  return `${req.ip}:${req.path}`;
}

/**
 * User-based key generator
 */
export function userKeyGenerator(req: Request): string {
  const userId = (req as any).user?.id || req.ip;
  return `user:${userId}:${req.path}`;
}

/**
 * API key-based key generator
 */
export function apiKeyGenerator(req: Request): string {
  const apiKey = req.get('X-API-Key') || req.ip;
  return `api:${apiKey}:${req.path}`;
}

/**
 * Custom key generator for specific endpoints
 */
export function customKeyGenerator(prefix: string) {
  return (req: Request): string => {
    return `${prefix}:${req.ip}:${req.path}`;
  };
}

/**
 * Clean up expired entries from store
 */
function cleanupExpiredEntries(now: number): void {
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

/**
 * Global rate limiting middleware
 */
export const globalRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many requests for this sensitive operation'
});

/**
 * Lenient rate limiting for read operations
 */
export const readRateLimit = rateLimitMiddleware({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'Too many read requests'
});

/**
 * Write operation rate limiting
 */
export const writeRateLimit = rateLimitMiddleware({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 write requests per minute
  message: 'Too many write requests'
});

/**
 * PDF generation rate limiting
 */
export const pdfRateLimit = rateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 PDF generations per 5 minutes
  message: 'Too many PDF generation requests'
});

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string): {
  count: number;
  resetTime: number;
  remaining: number;
} | null {
  const entry = store[key];
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  
  if (now > entry.resetTime) {
    return {
      count: 0,
      resetTime: now,
      remaining: 0
    };
  }
  
  return {
    count: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, entry.resetTime - now)
  };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  delete store[key];
  logger.info('Rate limit reset', { key });
}

/**
 * Get all rate limit entries (for monitoring)
 */
export function getAllRateLimitEntries(): RateLimitStore {
  const now = Date.now();
  cleanupExpiredEntries(now);
  return { ...store };
}

/**
 * Rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
  topKeys: Array<{ key: string; count: number }>;
} {
  const now = Date.now();
  cleanupExpiredEntries(now);
  
  const entries = Object.entries(store);
  const activeEntries = entries.filter(([_, entry]) => entry.resetTime > now);
  
  const topKeys = activeEntries
    .sort(([_, a], [__, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([key, entry]) => ({ key, count: entry.count }));
  
  return {
    totalEntries: entries.length,
    activeEntries: activeEntries.length,
    topKeys
  };
}