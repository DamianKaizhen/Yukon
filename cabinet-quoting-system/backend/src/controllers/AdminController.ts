import { Request, Response } from 'express';
import { AuthRequest, ValidationError, NotFoundError, CSVImportResult } from '@/types';
import { UserService } from '@/services/UserService';
import { CSVImportService } from '@/services/CSVImportService';
import { ResponseHelper } from '@/utils/response';
import { logger } from '@/utils/logger';
import database from '@/config/database';
import fs from 'fs';
import path from 'path';

export class AdminController {
  private userService: UserService;
  private csvImportService: CSVImportService;

  constructor() {
    this.userService = new UserService();
    this.csvImportService = new CSVImportService();
  }

  /**
   * Get system information
   */
  public getSystemInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const memoryUsage = process.memoryUsage();
      const dbHealth = await database.healthCheck();
      
      const systemInfo = {
        service: 'Cabinet Quoting System API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory_usage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
        },
        database_status: dbHealth ? 'healthy' : 'unhealthy',
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
        pid: process.pid
      };
      
      ResponseHelper.success(res, systemInfo, 'System information retrieved successfully');
    } catch (error) {
      logger.error('Error getting system info', error);
      ResponseHelper.serverError(res, 'Failed to retrieve system information');
    }
  };

  /**
   * Get system statistics
   */
  public getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.csvImportService.getSystemStats();
      ResponseHelper.success(res, stats, 'System statistics retrieved successfully');
    } catch (error) {
      logger.error('Error getting system stats', error);
      ResponseHelper.serverError(res, 'Failed to retrieve system statistics');
    }
  };

  /**
   * Get system health
   */
  public getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const dbHealth = await database.healthCheck();
      const health = {
        database: dbHealth ? 'healthy' : 'unhealthy',
        api: 'healthy',
        overall: dbHealth ? 'healthy' : 'degraded'
      };
      
      ResponseHelper.success(res, health, 'System health retrieved successfully');
    } catch (error) {
      logger.error('Error getting system health', error);
      ResponseHelper.serverError(res, 'Failed to retrieve system health');
    }
  };

  /**
   * List users
   */
  public listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, role, is_active, search } = req.query;
      
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: Math.min(parseInt((limit as string) || '20'), 100),
        role: role as any,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        search: search as string
      };
      
      const result = await this.userService.list(params);
      
      ResponseHelper.paginated(
        res,
        result.users,
        result.total,
        params.page,
        params.limit,
        'Users retrieved successfully'
      );
    } catch (error) {
      logger.error('Error listing users', error);
      ResponseHelper.serverError(res, 'Failed to retrieve users');
    }
  };

  /**
   * Create user
   */
  public createUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await this.userService.create(req.body);
      
      logger.info('User created by admin', {
        newUserId: user.id,
        adminId: req.user?.id
      });
      
      ResponseHelper.created(res, user, 'User created successfully');
    } catch (error) {
      logger.error('Error creating user', error);
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to create user');
      }
    }
  };

  /**
   * Get user by ID
   */
  public getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      
      if (!user) {
        ResponseHelper.notFound(res, 'User not found');
        return;
      }
      
      ResponseHelper.success(res, user, 'User retrieved successfully');
    } catch (error) {
      logger.error('Error getting user', error);
      ResponseHelper.serverError(res, 'Failed to retrieve user');
    }
  };

  /**
   * Update user
   */
  public updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.update(id, req.body);
      
      logger.info('User updated by admin', {
        updatedUserId: id,
        adminId: req.user?.id
      });
      
      ResponseHelper.success(res, user, 'User updated successfully');
    } catch (error) {
      logger.error('Error updating user', error);
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else if (error instanceof NotFoundError) {
        ResponseHelper.notFound(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to update user');
      }
    }
  };

  /**
   * Delete user
   */
  public deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.userService.delete(id);
      
      logger.info('User deleted by admin', {
        deletedUserId: id,
        adminId: req.user?.id
      });
      
      ResponseHelper.noContent(res);
    } catch (error) {
      logger.error('Error deleting user', error);
      
      if (error instanceof NotFoundError) {
        ResponseHelper.notFound(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to delete user');
      }
    }
  };

  /**
   * Reset user password
   */
  public resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Password reset functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to reset password');
    }
  };

  /**
   * Import products from CSV
   */
  public importProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        ResponseHelper.validationError(res, 'CSV file is required');
        return;
      }

      const result = await this.csvImportService.importProducts(req.file.path);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      logger.info('Products imported via CSV', {
        importedBy: req.user?.id,
        result
      });
      
      ResponseHelper.success(res, result, 'Products imported successfully');
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Error importing products', error);
      ResponseHelper.serverError(res, 'Failed to import products');
    }
  };

  /**
   * Import customers from CSV
   */
  public importCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        ResponseHelper.validationError(res, 'CSV file is required');
        return;
      }

      const result = await this.csvImportService.importCustomers(req.file.path);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      logger.info('Customers imported via CSV', {
        importedBy: req.user?.id,
        result
      });
      
      ResponseHelper.success(res, result, 'Customers imported successfully');
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Error importing customers', error);
      ResponseHelper.serverError(res, 'Failed to import customers');
    }
  };

  /**
   * Import pricing from CSV
   */
  public importPricing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        ResponseHelper.validationError(res, 'CSV file is required');
        return;
      }

      const result = await this.csvImportService.importPricing(req.file.path);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      logger.info('Pricing imported via CSV', {
        importedBy: req.user?.id,
        result
      });
      
      ResponseHelper.success(res, result, 'Pricing imported successfully');
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      logger.error('Error importing pricing', error);
      ResponseHelper.serverError(res, 'Failed to import pricing');
    }
  };

  /**
   * Get import history
   */
  public getImportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const history = await this.csvImportService.getImportHistory();
      ResponseHelper.success(res, history, 'Import history retrieved successfully');
    } catch (error) {
      logger.error('Error getting import history', error);
      ResponseHelper.serverError(res, 'Failed to retrieve import history');
    }
  };

  /**
   * Get import template
   */
  public getImportTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const template = this.csvImportService.getImportTemplate(type);
      
      if (!template) {
        ResponseHelper.notFound(res, 'Template not found');
        return;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
      res.send(template);
    } catch (error) {
      logger.error('Error getting import template', error);
      ResponseHelper.serverError(res, 'Failed to retrieve template');
    }
  };

  /**
   * Export products
   */
  public exportProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Export functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to export products');
    }
  };

  /**
   * Export customers
   */
  public exportCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Export functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to export customers');
    }
  };

  /**
   * Export quotes
   */
  public exportQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Export functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to export quotes');
    }
  };

  /**
   * Create database backup
   */
  public createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Backup functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to create backup');
    }
  };

  /**
   * List database backups
   */
  public listBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.success(res, [], 'Backups retrieved successfully');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to list backups');
    }
  };

  /**
   * Restore database backup
   */
  public restoreBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Restore functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to restore backup');
    }
  };

  /**
   * Vacuum database
   */
  public vacuumDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      await database.query('VACUUM ANALYZE');
      ResponseHelper.success(res, null, 'Database vacuum completed successfully');
    } catch (error) {
      logger.error('Error vacuuming database', error);
      ResponseHelper.serverError(res, 'Failed to vacuum database');
    }
  };

  /**
   * Get logs
   */
  public getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Logs functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to retrieve logs');
    }
  };

  /**
   * Get error logs
   */
  public getErrorLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Error logs functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to retrieve error logs');
    }
  };

  /**
   * Clear logs
   */
  public clearLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Clear logs functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to clear logs');
    }
  };
}