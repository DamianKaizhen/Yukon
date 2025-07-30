import { Request, Response, NextFunction } from 'express';
import { AuthRequest, User, UserRole, AuthenticationError, AuthorizationError } from '@/types';
import { AuthHelper } from '@/utils/auth';
import { ResponseHelper } from '@/utils/response';
import { UserService } from '@/services/UserService';
import { logger } from '@/utils/logger';

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthHelper.extractTokenFromHeader(authHeader);

    if (!token) {
      ResponseHelper.unauthorized(res, 'Authentication token required');
      return;
    }

    // Verify token
    const payload = AuthHelper.verifyAccessToken(token);
    
    // Get user from database
    const userService = new UserService();
    const user = await userService.findById(payload.userId);
    
    if (!user || !user.is_active) {
      ResponseHelper.unauthorized(res, 'User not found or inactive');
      return;
    }

    // Attach user to request
    req.user = user;
    
    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      ResponseHelper.unauthorized(res, error.message);
    } else {
      logger.error('Authentication error', error);
      ResponseHelper.serverError(res, 'Authentication failed');
    }
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthHelper.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = AuthHelper.verifyAccessToken(token);
      const userService = new UserService();
      const user = await userService.findById(payload.userId);
      
      if (user && user.is_active) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silent fail for optional auth
    logger.debug('Optional authentication failed', error);
    next();
  }
};

/**
 * Authorization middleware factory that checks user roles
 */
export const authorize = (requiredRole: UserRole) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res, 'Authentication required');
        return;
      }

      if (!AuthHelper.hasRole(req.user.role, requiredRole)) {
        ResponseHelper.forbidden(res, `Insufficient permissions. Required role: ${requiredRole}`);
        return;
      }

      logger.debug('User authorized', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole
      });

      next();
    } catch (error) {
      logger.error('Authorization error', error);
      ResponseHelper.serverError(res, 'Authorization failed');
    }
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Sales or Admin middleware
 */
export const requireSales = authorize(UserRole.SALES);

/**
 * Any authenticated user middleware
 */
export const requireAuth = authenticate;

/**
 * Resource ownership middleware - allows users to access only their own resources
 * or admins to access any resource
 */
export const requireOwnership = (resourceUserIdField: string = 'user_id') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res, 'Authentication required');
        return;
      }

      // Admins can access any resource
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (resourceUserId && resourceUserId !== req.user.id) {
        ResponseHelper.forbidden(res, 'Access denied: insufficient permissions');
        return;
      }

      next();
    } catch (error) {
      logger.error('Ownership check error', error);
      ResponseHelper.serverError(res, 'Authorization failed');
    }
  };
};

/**
 * API Key authentication for service-to-service communication
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    ResponseHelper.unauthorized(res, 'API key required');
    return;
  }
  
  // Validate API key (implement your API key validation logic)
  if (!isValidApiKey(apiKey)) {
    ResponseHelper.unauthorized(res, 'Invalid API key');
    return;
  }
  
  next();
};

// Helper function to validate API keys
function isValidApiKey(apiKey: string): boolean {
  // Implement your API key validation logic here
  // This could check against a database, environment variables, etc.
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validApiKeys.includes(apiKey);
}

/**
 * Rate limiting by user ID
 */
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    const userLimit = userRequests.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (userLimit.count >= maxRequests) {
      ResponseHelper.error(res, 'Rate limit exceeded', 429);
      return;
    }
    
    userLimit.count++;
    next();
  };
};