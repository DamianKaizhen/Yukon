import { Request, Response } from 'express';
import { AuthRequest, SearchParams, ValidationError, NotFoundError, ConflictError } from '@/types';
import { CustomerService } from '@/services/CustomerService';
import { ResponseHelper } from '@/utils/response';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Create a new customer
   */
  public createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customerData = req.body;
      
      const customer = await this.customerService.create(customerData);
      
      logger.info('Customer created via API', {
        customerId: customer.id,
        createdBy: req.user?.id
      });
      
      ResponseHelper.created(res, customer, 'Customer created successfully');
      
    } catch (error) {
      logger.error('Error creating customer via API', {
        customerData: req.body,
        userId: req.user?.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else if (error instanceof ConflictError) {
        ResponseHelper.conflict(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to create customer');
      }
    }
  };

  /**
   * Get customer by ID
   */
  public getCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const customer = await this.customerService.findById(id);
      
      if (!customer) {
        ResponseHelper.notFound(res, 'Customer not found');
        return;
      }
      
      ResponseHelper.success(res, customer, 'Customer retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customer', {
        customerId: req.params.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve customer');
      }
    }
  };

  /**
   * Update customer
   */
  public updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const customer = await this.customerService.update(id, updates);
      
      logger.info('Customer updated via API', {
        customerId: id,
        updatedBy: req.user?.id,
        updates: Object.keys(updates)
      });
      
      ResponseHelper.success(res, customer, 'Customer updated successfully');
      
    } catch (error) {
      logger.error('Error updating customer via API', {
        customerId: req.params.id,
        updates: req.body,
        userId: req.user?.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else if (error instanceof NotFoundError) {
        ResponseHelper.notFound(res, error.message);
      } else if (error instanceof ConflictError) {
        ResponseHelper.conflict(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to update customer');
      }
    }
  };

  /**
   * Delete customer
   */
  public deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.customerService.delete(id);
      
      logger.info('Customer deleted via API', {
        customerId: id,
        deletedBy: req.user?.id
      });
      
      ResponseHelper.noContent(res);
      
    } catch (error) {
      logger.error('Error deleting customer via API', {
        customerId: req.params.id,
        userId: req.user?.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else if (error instanceof NotFoundError) {
        ResponseHelper.notFound(res, error.message);
      } else if (error instanceof ConflictError) {
        ResponseHelper.conflict(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to delete customer');
      }
    }
  };

  /**
   * List customers with pagination and search
   */
  public listCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, sort, order } = req.query;
      
      const params: SearchParams = {
        page: page ? parseInt(page as string) : 1,
        limit: Math.min(parseInt((limit as string) || '20'), 100),
        search: search as string,
        sort: sort as string || 'created_at',
        order: (order as 'asc' | 'desc') || 'desc'
      };
      
      const result = await this.customerService.list(params);
      
      ResponseHelper.paginated(
        res,
        result.customers,
        result.total,
        params.page!,
        params.limit!,
        'Customers retrieved successfully'
      );
      
    } catch (error) {
      logger.error('Error listing customers', {
        query: req.query,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve customers');
      }
    }
  };

  /**
   * Search customers
   */
  public searchCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        ResponseHelper.validationError(res, 'Search query (q) is required');
        return;
      }
      
      const searchLimit = limit ? Math.min(parseInt(limit as string), 50) : 10;
      const customers = await this.customerService.search(q, searchLimit);
      
      ResponseHelper.success(res, customers, 'Customer search completed');
      
    } catch (error) {
      logger.error('Error searching customers', {
        query: req.query,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Search failed');
      }
    }
  };

  /**
   * Get customer by email
   */
  public getCustomerByEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      
      const customer = await this.customerService.findByEmail(email);
      
      if (!customer) {
        ResponseHelper.notFound(res, 'Customer not found');
        return;
      }
      
      ResponseHelper.success(res, customer, 'Customer retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customer by email', {
        email: req.params.email,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve customer');
      }
    }
  };

  /**
   * Get customer by customer number
   */
  public getCustomerByNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { number } = req.params;
      
      const customer = await this.customerService.findByCustomerNumber(number);
      
      if (!customer) {
        ResponseHelper.notFound(res, 'Customer not found');
        return;
      }
      
      ResponseHelper.success(res, customer, 'Customer retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customer by number', {
        customerNumber: req.params.number,
        error
      });
      
      ResponseHelper.serverError(res, 'Failed to retrieve customer');
    }
  };

  /**
   * Get customer statistics
   */
  public getCustomerStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // First check if customer exists
      const customer = await this.customerService.findById(id);
      if (!customer) {
        ResponseHelper.notFound(res, 'Customer not found');
        return;
      }
      
      const statistics = await this.customerService.getStatistics(id);
      
      ResponseHelper.success(res, {
        customer_id: id,
        ...statistics
      }, 'Customer statistics retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customer statistics', {
        customerId: req.params.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve customer statistics');
      }
    }
  };

  /**
   * Get customers by location
   */
  public getCustomersByLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, state_province, country, limit } = req.query;
      
      const params = {
        city: city as string,
        state_province: state_province as string,
        country: country as string,
        limit: limit ? Math.min(parseInt(limit as string), 100) : 50
      };
      
      const customers = await this.customerService.getByLocation(params);
      
      ResponseHelper.success(res, customers, 'Customers by location retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customers by location', {
        query: req.query,
        error
      });
      
      ResponseHelper.serverError(res, 'Failed to retrieve customers by location');
    }
  };

  /**
   * Check if email exists
   */
  public checkEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      
      const customer = await this.customerService.findByEmail(email);
      
      ResponseHelper.success(res, {
        email,
        exists: !!customer,
        customer_id: customer?.id || null
      }, 'Email check completed');
      
    } catch (error) {
      logger.error('Error checking customer email', {
        email: req.params.email,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Email check failed');
      }
    }
  };

  /**
   * Get customer activity summary
   */
  public getCustomerActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit } = req.query;
      
      // Verify customer exists
      const customer = await this.customerService.findById(id);
      if (!customer) {
        ResponseHelper.notFound(res, 'Customer not found');
        return;
      }
      
      // Get recent quotes for this customer
      const quotesLimit = limit ? Math.min(parseInt(limit as string), 50) : 10;
      
      // This would typically query the quotes table
      // For now, return customer statistics
      const statistics = await this.customerService.getStatistics(id);
      
      ResponseHelper.success(res, {
        customer: {
          id: customer.id,
          customer_number: customer.customer_number,
          company_name: customer.company_name,
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email
        },
        activity: statistics,
        recent_quotes: [] // Would be populated with actual quote data
      }, 'Customer activity retrieved successfully');
      
    } catch (error) {
      logger.error('Error getting customer activity', {
        customerId: req.params.id,
        error
      });
      
      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve customer activity');
      }
    }
  };
}