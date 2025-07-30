import { User, UserRole, ValidationError, NotFoundError, ConflictError } from '@/types';
import database from '@/config/database';
import { AuthHelper } from '@/utils/auth';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class UserService {
  private readonly tableName = 'users';

  /**
   * Find user by ID
   */
  public async findById(id: string): Promise<User | null> {
    try {
      Validator.validateUUIDFormat(id, 'User ID');
      
      const query = `
        SELECT id, email, password_hash, first_name, last_name, 
               role, is_active, last_login, email_verified,
               created_at, updated_at
        FROM ${this.tableName}
        WHERE id = $1
      `;
      
      const result = await database.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', { userId: id, error });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      Validator.validateEmailFormat(email);
      
      const query = `
        SELECT id, email, password_hash, first_name, last_name, 
               role, is_active, last_login, email_verified,
               created_at, updated_at
        FROM ${this.tableName}
        WHERE email = $1
      `;
      
      const result = await database.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  /**
   * Create a new user
   */
  public async create(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      // Validate input
      Validator.validateRequiredFields(userData, ['email', 'password', 'first_name', 'last_name']);
      Validator.validateEmailFormat(userData.email);
      Validator.validatePassword(userData.password);
      Validator.validateStringLength(userData.first_name, 1, 100, 'First name');
      Validator.validateStringLength(userData.last_name, 1, 100, 'Last name');
      
      if (userData.role) {
        Validator.validateUserRole(userData.role);
      }
      
      // Check if user already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }
      
      // Hash password
      const passwordHash = await AuthHelper.hashPassword(userData.password);
      
      const query = `
        INSERT INTO ${this.tableName} (
          email, password_hash, first_name, last_name, role, is_active, email_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, first_name, last_name, role, is_active, 
                  email_verified, created_at, updated_at
      `;
      
      const values = [
        userData.email.toLowerCase(),
        passwordHash,
        userData.first_name.trim(),
        userData.last_name.trim(),
        userData.role || UserRole.VIEWER,
        true,
        false
      ];
      
      const result = await database.query(query, values);
      const user = result.rows[0];
      
      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return user;
    } catch (error) {
      logger.error('Error creating user', { userData: { ...userData, password: '[REDACTED]' }, error });
      throw error;
    }
  }

  /**
   * Update user
   */
  public async update(id: string, updates: Partial<{
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    is_active: boolean;
    email_verified: boolean;
  }>): Promise<User> {
    try {
      Validator.validateUUIDFormat(id, 'User ID');
      
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Validate updates
      if (updates.email) {
        Validator.validateEmailFormat(updates.email);
        
        // Check if email is already taken by another user
        const existingUser = await this.findByEmail(updates.email);
        if (existingUser && existingUser.id !== id) {
          throw new ConflictError('Email is already taken');
        }
      }
      
      if (updates.first_name) {
        Validator.validateStringLength(updates.first_name, 1, 100, 'First name');
      }
      
      if (updates.last_name) {
        Validator.validateStringLength(updates.last_name, 1, 100, 'Last name');
      }
      
      if (updates.role) {
        Validator.validateUserRole(updates.role);
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(key === 'email' ? value.toLowerCase() : value);
          paramCount++;
        }
      });
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, first_name, last_name, role, is_active,
                  email_verified, last_login, created_at, updated_at
      `;
      
      const result = await database.query(query, values);
      const updatedUser = result.rows[0];
      
      logger.info('User updated successfully', {
        userId: id,
        updates: Object.keys(updates)
      });
      
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user', { userId: id, updates, error });
      throw error;
    }
  }

  /**
   * Update user password
   */
  public async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      Validator.validateUUIDFormat(id, 'User ID');
      Validator.validatePassword(newPassword);
      
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Verify current password
      const isCurrentPasswordValid = await AuthHelper.comparePassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }
      
      // Hash new password
      const newPasswordHash = await AuthHelper.hashPassword(newPassword);
      
      const query = `
        UPDATE ${this.tableName}
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await database.query(query, [newPasswordHash, id]);
      
      logger.info('User password updated successfully', { userId: id });
    } catch (error) {
      logger.error('Error updating user password', { userId: id, error });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  public async updateLastLogin(id: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Error updating last login', { userId: id, error });
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  public async list(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    is_active?: boolean;
    search?: string;
  } = {}): Promise<{ users: User[]; total: number }> {
    try {
      const { page = 1, limit = 20, role, is_active, search } = params;
      const offset = (page - 1) * limit;
      
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (role) {
        conditions.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }
      
      if (is_active !== undefined) {
        conditions.push(`is_active = $${paramCount}`);
        values.push(is_active);
        paramCount++;
      }
      
      if (search) {
        conditions.push(`(
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          email ILIKE $${paramCount}
        )`);
        values.push(`%${search}%`);
        paramCount++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await database.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);
      
      // Get users
      values.push(limit, offset);
      const query = `
        SELECT id, email, first_name, last_name, role, is_active,
               email_verified, last_login, created_at, updated_at
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const result = await database.query(query, values);
      
      return {
        users: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error listing users', { params, error });
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   */
  public async delete(id: string): Promise<void> {
    try {
      Validator.validateUUIDFormat(id, 'User ID');
      
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      const query = `
        UPDATE ${this.tableName}
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await database.query(query, [id]);
      
      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      logger.error('Error deleting user', { userId: id, error });
      throw error;
    }
  }

  /**
   * Verify user credentials
   */
  public async verifyCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.is_active) {
        return null;
      }
      
      const isPasswordValid = await AuthHelper.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }
      
      // Update last login
      await this.updateLastLogin(user.id);
      
      return user;
    } catch (error) {
      logger.error('Error verifying credentials', { email, error });
      throw error;
    }
  }

  /**
   * Create initial admin user if no users exist
   */
  public async createInitialAdmin(): Promise<void> {
    try {
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const result = await database.query(countQuery);
      const userCount = parseInt(result.rows[0].total);
      
      if (userCount === 0) {
        await this.create({
          email: process.env.ADMIN_EMAIL || 'admin@cabinet-system.com',
          password: process.env.ADMIN_PASSWORD || 'admin123',
          first_name: 'System',
          last_name: 'Administrator',
          role: UserRole.ADMIN
        });
        
        logger.info('Initial admin user created');
      }
    } catch (error) {
      logger.error('Error creating initial admin user', error);
      throw error;
    }
  }
}