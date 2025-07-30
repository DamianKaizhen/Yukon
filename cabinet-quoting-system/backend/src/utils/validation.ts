import { ValidationError } from '@/types';

export class Validator {
  public static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public static isUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  public static isPositiveNumber(value: any): boolean {
    return typeof value === 'number' && value > 0 && !isNaN(value);
  }

  public static isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  public static isValidPaginationParams(params: any): { page: number; limit: number } {
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    
    if (page < 1) {
      throw new ValidationError('Page must be a positive integer');
    }
    
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    
    return { page, limit };
  }

  public static validateRequiredFields(data: any, requiredFields: string[]): void {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  public static sanitizeString(value: any): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    return value.trim();
  }

  public static validateEmailFormat(email: string): void {
    if (!this.isEmail(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  public static validateUUIDFormat(value: string, fieldName: string = 'ID'): void {
    if (!this.isUUID(value)) {
      throw new ValidationError(`Invalid ${fieldName} format`);
    }
  }

  public static validatePositiveNumber(value: any, fieldName: string): void {
    if (!this.isPositiveNumber(value)) {
      throw new ValidationError(`${fieldName} must be a positive number`);
    }
  }

  public static validateStringLength(value: string, minLength: number, maxLength: number, fieldName: string): void {
    if (value.length < minLength || value.length > maxLength) {
      throw new ValidationError(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
    }
  }

  public static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  public static validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new ValidationError('Start date must be before end date');
    }
  }

  public static validateQuoteStatus(status: string): void {
    const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid quote status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  public static validateUserRole(role: string): void {
    const validRoles = ['admin', 'sales', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid user role. Must be one of: ${validRoles.join(', ')}`);
    }
  }
}

export default Validator;