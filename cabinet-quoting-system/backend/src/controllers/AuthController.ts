import { Request, Response } from 'express';
import { AuthRequest, User, UserRole, ValidationError, AuthenticationError } from '@/types';
import { UserService } from '@/services/UserService';
import { AuthHelper } from '@/utils/auth';
import { ResponseHelper } from '@/utils/response';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * User login
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      // Validate input
      Validator.validateRequiredFields({ email, password }, ['email', 'password']);
      Validator.validateEmailFormat(email);
      
      // Verify credentials
      const user = await this.userService.verifyCredentials(email, password);
      
      if (!user) {
        ResponseHelper.unauthorized(res, 'Invalid email or password');
        return;
      }
      
      // Generate tokens
      const tokens = AuthHelper.generateTokenPair(user);
      
      // Prepare user data (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: user.email_verified,
        last_login: user.last_login
      };
      
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      ResponseHelper.success(res, {
        user: userData,
        ...tokens
      }, 'Login successful');
      
    } catch (error) {
      logger.error('Login error', { email: req.body.email, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Login failed');
      }
    }
  };

  /**
   * User registration (admin only)
   */
  public register = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, first_name, last_name, role } = req.body;
      
      // Validate input
      Validator.validateRequiredFields(
        { email, password, first_name, last_name },
        ['email', 'password', 'first_name', 'last_name']
      );
      
      // Create user
      const user = await this.userService.create({
        email,
        password,
        first_name,
        last_name,
        role: role || UserRole.VIEWER
      });
      
      // Prepare user data (exclude password)
      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: user.email_verified,
        created_at: user.created_at
      };
      
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdBy: req.user?.id
      });
      
      ResponseHelper.created(res, userData, 'User registered successfully');
      
    } catch (error) {
      logger.error('Registration error', { userData: req.body, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Registration failed');
      }
    }
  };

  /**
   * Refresh access token
   */
  public refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        ResponseHelper.validationError(res, 'Refresh token is required');
        return;
      }
      
      // Verify refresh token
      const payload = AuthHelper.verifyRefreshToken(refreshToken);
      
      // Get user
      const user = await this.userService.findById(payload.userId);
      
      if (!user || !user.is_active) {
        ResponseHelper.unauthorized(res, 'User not found or inactive');
        return;
      }
      
      // Generate new tokens
      const tokens = AuthHelper.generateTokenPair(user);
      
      logger.info('Token refreshed successfully', {
        userId: user.id,
        email: user.email
      });
      
      ResponseHelper.success(res, tokens, 'Token refreshed successfully');
      
    } catch (error) {
      logger.error('Token refresh error', error);
      
      if (error instanceof AuthenticationError) {
        ResponseHelper.unauthorized(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Token refresh failed');
      }
    }
  };

  /**
   * Get current user profile
   */
  public me = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }
      
      // Prepare user data (exclude password)
      const userData = {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        role: req.user.role,
        email_verified: req.user.email_verified,
        last_login: req.user.last_login,
        created_at: req.user.created_at,
        updated_at: req.user.updated_at
      };
      
      ResponseHelper.success(res, userData, 'User profile retrieved successfully');
      
    } catch (error) {
      logger.error('Profile retrieval error', { userId: req.user?.id, error });
      ResponseHelper.serverError(res, 'Failed to retrieve profile');
    }
  };

  /**
   * Update user profile
   */
  public updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }
      
      const { first_name, last_name, email } = req.body;
      const updates: any = {};
      
      if (first_name) updates.first_name = first_name;
      if (last_name) updates.last_name = last_name;
      if (email) updates.email = email;
      
      if (Object.keys(updates).length === 0) {
        ResponseHelper.validationError(res, 'No valid fields to update');
        return;
      }
      
      const updatedUser = await this.userService.update(req.user.id, updates);
      
      // Prepare user data (exclude password)
      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        role: updatedUser.role,
        email_verified: updatedUser.email_verified,
        updated_at: updatedUser.updated_at
      };
      
      logger.info('Profile updated successfully', {
        userId: req.user.id,
        updates: Object.keys(updates)
      });
      
      ResponseHelper.success(res, userData, 'Profile updated successfully');
      
    } catch (error) {
      logger.error('Profile update error', { userId: req.user?.id, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Profile update failed');
      }
    }
  };

  /**
   * Change password
   */
  public changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      Validator.validateRequiredFields(
        { currentPassword, newPassword },
        ['currentPassword', 'newPassword']
      );
      
      await this.userService.updatePassword(req.user.id, currentPassword, newPassword);
      
      logger.info('Password changed successfully', {
        userId: req.user.id,
        email: req.user.email
      });
      
      ResponseHelper.success(res, null, 'Password changed successfully');
      
    } catch (error) {
      logger.error('Password change error', { userId: req.user?.id, error });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Password change failed');
      }
    }
  };

  /**
   * Logout (client-side token invalidation)
   */
  public logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      logger.info('User logged out', {
        userId: req.user?.id,
        email: req.user?.email
      });
      
      ResponseHelper.success(res, null, 'Logged out successfully');
      
    } catch (error) {
      logger.error('Logout error', { userId: req.user?.id, error });
      ResponseHelper.serverError(res, 'Logout failed');
    }
  };

  /**
   * Verify token (for middleware or frontend checks)
   */
  public verifyToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res, 'Invalid token');
        return;
      }
      
      ResponseHelper.success(res, {
        valid: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        }
      }, 'Token is valid');
      
    } catch (error) {
      logger.error('Token verification error', error);
      ResponseHelper.unauthorized(res, 'Token verification failed');
    }
  };

  /**
   * Get user permissions based on role
   */
  public getPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }
      
      const permissions = this.getRolePermissions(req.user.role);
      
      ResponseHelper.success(res, {
        role: req.user.role,
        permissions
      }, 'Permissions retrieved successfully');
      
    } catch (error) {
      logger.error('Permissions retrieval error', { userId: req.user?.id, error });
      ResponseHelper.serverError(res, 'Failed to retrieve permissions');
    }
  };

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.VIEWER]: [
        'read:products',
        'read:catalog',
        'read:own_quotes'
      ],
      [UserRole.SALES]: [
        'read:products',
        'read:catalog',
        'read:customers',
        'write:customers',
        'read:quotes',
        'write:quotes',
        'read:own_quotes',
        'write:own_quotes'
      ],
      [UserRole.ADMIN]: [
        'read:*',
        'write:*',
        'delete:*',
        'admin:users',
        'admin:system',
        'admin:import'
      ]
    };
    
    return permissions[role] || [];
  }
}