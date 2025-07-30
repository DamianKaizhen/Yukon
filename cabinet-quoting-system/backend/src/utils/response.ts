import { Response } from 'express';
import { ApiResponse } from '@/types';
import { logger } from './logger';

export class ResponseHelper {
  public static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    meta?: any
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta
    };
    
    logger.debug('API Success Response', {
      statusCode,
      hasData: !!data,
      message
    });
    
    return res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: string[]
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };
    
    logger.error('API Error Response', {
      statusCode,
      message,
      errors
    });
    
    return res.status(statusCode).json(response);
  }

  public static validationError(
    res: Response,
    errors: string | string[],
    message: string = 'Validation failed'
  ): Response {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    return this.error(res, message, 400, errorArray);
  }

  public static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404);
  }

  public static unauthorized(
    res: Response,
    message: string = 'Authentication required'
  ): Response {
    return this.error(res, message, 401);
  }

  public static forbidden(
    res: Response,
    message: string = 'Insufficient permissions'
  ): Response {
    return this.error(res, message, 403);
  }

  public static conflict(
    res: Response,
    message: string = 'Resource conflict'
  ): Response {
    return this.error(res, message, 409);
  }

  public static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, 500);
  }

  public static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  public static noContent(res: Response): Response {
    return res.status(204).send();
  }

  public static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): Response {
    const pages = Math.ceil(total / limit);
    const meta = {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    };
    
    return this.success(res, data, message, 200, meta);
  }
}

export default ResponseHelper;