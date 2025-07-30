import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';

/**
 * Middleware to handle express-validator validation results
 */
export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => {
      return `${error.param}: ${error.msg}`;
    });
    
    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      body: req.body
    });
    
    ResponseHelper.validationError(res, errorMessages, 'Validation failed');
    return;
  }
  
  next();
};

export default validationMiddleware;