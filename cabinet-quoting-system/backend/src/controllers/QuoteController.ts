import { Request, Response } from 'express';
import { AuthRequest, SearchParams, ValidationError, NotFoundError, ConflictError, QuoteStatus } from '@/types';
import { QuoteService } from '@/services/QuoteService';
import { ResponseHelper } from '@/utils/response';
import { Validator } from '@/utils/validation';
import { logger } from '@/utils/logger';

export class QuoteController {
  private quoteService: QuoteService;

  constructor() {
    this.quoteService = new QuoteService();
  }

  /**
   * Create a new quote
   */
  public createQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const quoteData = {
        ...req.body,
        created_by: req.user.id
      };

      const quote = await this.quoteService.create(quoteData);

      logger.info('Quote created via API', {
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        createdBy: req.user.id
      });

      ResponseHelper.created(res, quote, 'Quote created successfully');

    } catch (error) {
      logger.error('Error creating quote via API', {
        quoteData: req.body,
        userId: req.user?.id,
        error
      });

      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to create quote');
      }
    }
  };

  /**
   * Get quote by ID
   */
  public getQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { include_items } = req.query;

      const quote = await this.quoteService.getById(id, include_items !== 'false');

      if (!quote) {
        ResponseHelper.notFound(res, 'Quote not found');
        return;
      }

      ResponseHelper.success(res, quote, 'Quote retrieved successfully');

    } catch (error) {
      logger.error('Error getting quote', {
        quoteId: req.params.id,
        error
      });

      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve quote');
      }
    }
  };

  /**
   * Update quote
   */
  public updateQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const quote = await this.quoteService.update(id, updates);

      logger.info('Quote updated via API', {
        quoteId: id,
        updatedBy: req.user?.id,
        updates: Object.keys(updates)
      });

      ResponseHelper.success(res, quote, 'Quote updated successfully');

    } catch (error) {
      logger.error('Error updating quote via API', {
        quoteId: req.params.id,
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
        ResponseHelper.serverError(res, 'Failed to update quote');
      }
    }
  };

  /**
   * Delete quote
   */
  public deleteQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.quoteService.delete(id);

      logger.info('Quote deleted via API', {
        quoteId: id,
        deletedBy: req.user?.id
      });

      ResponseHelper.noContent(res);

    } catch (error) {
      logger.error('Error deleting quote via API', {
        quoteId: req.params.id,
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
        ResponseHelper.serverError(res, 'Failed to delete quote');
      }
    }
  };

  /**
   * List quotes with pagination and filtering
   */
  public listQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search, customer_id, status, created_by, sort, order } = req.query;

      const params: SearchParams & {
        customer_id?: string;
        status?: QuoteStatus;
        created_by?: string;
      } = {
        page: page ? parseInt(page as string) : 1,
        limit: Math.min(parseInt((limit as string) || '20'), 100),
        search: search as string,
        sort: sort as string || 'created_at',
        order: (order as 'asc' | 'desc') || 'desc',
        customer_id: customer_id as string,
        status: status as QuoteStatus,
        created_by: created_by as string
      };

      const result = await this.quoteService.list(params);

      ResponseHelper.paginated(
        res,
        result.quotes,
        result.total,
        params.page!,
        params.limit!,
        'Quotes retrieved successfully'
      );

    } catch (error) {
      logger.error('Error listing quotes', {
        query: req.query,
        error
      });

      if (error instanceof ValidationError) {
        ResponseHelper.validationError(res, error.message);
      } else {
        ResponseHelper.serverError(res, 'Failed to retrieve quotes');
      }
    }
  };

  /**
   * Duplicate quote
   */
  public duplicateQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Duplicate quote functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to duplicate quote');
    }
  };

  /**
   * Send quote to customer
   */
  public sendQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quote = await this.quoteService.update(id, {
        status: QuoteStatus.SENT
      });

      logger.info('Quote sent', {
        quoteId: id,
        sentBy: req.user?.id
      });

      ResponseHelper.success(res, quote, 'Quote sent successfully');

    } catch (error) {
      logger.error('Error sending quote', {
        quoteId: req.params.id,
        userId: req.user?.id,
        error
      });

      ResponseHelper.serverError(res, 'Failed to send quote');
    }
  };

  /**
   * Approve quote
   */
  public approveQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        ResponseHelper.unauthorized(res);
        return;
      }

      const quote = await this.quoteService.update(id, {
        status: QuoteStatus.APPROVED,
        approved_by: req.user.id
      });

      logger.info('Quote approved', {
        quoteId: id,
        approvedBy: req.user.id
      });

      ResponseHelper.success(res, quote, 'Quote approved successfully');

    } catch (error) {
      logger.error('Error approving quote', {
        quoteId: req.params.id,
        userId: req.user?.id,
        error
      });

      ResponseHelper.serverError(res, 'Failed to approve quote');
    }
  };

  /**
   * Reject quote
   */
  public rejectQuote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quote = await this.quoteService.update(id, {
        status: QuoteStatus.REJECTED
      });

      logger.info('Quote rejected', {
        quoteId: id,
        rejectedBy: req.user?.id
      });

      ResponseHelper.success(res, quote, 'Quote rejected successfully');

    } catch (error) {
      logger.error('Error rejecting quote', {
        quoteId: req.params.id,
        userId: req.user?.id,
        error
      });

      ResponseHelper.serverError(res, 'Failed to reject quote');
    }
  };

  /**
   * Recalculate quote totals
   */
  public recalculateTotals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quote = await this.quoteService.recalculateTotals(id);

      logger.info('Quote totals recalculated', {
        quoteId: id,
        requestedBy: req.user?.id
      });

      ResponseHelper.success(res, quote, 'Quote totals recalculated successfully');

    } catch (error) {
      logger.error('Error recalculating quote totals', {
        quoteId: req.params.id,
        userId: req.user?.id,
        error
      });

      ResponseHelper.serverError(res, 'Failed to recalculate quote totals');
    }
  };

  /**
   * Export quote as PDF
   */
  public exportPdf = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'PDF export functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to export PDF');
    }
  };

  /**
   * Export quote as Excel
   */
  public exportExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      ResponseHelper.serverError(res, 'Excel export functionality not implemented yet');
    } catch (error) {
      ResponseHelper.serverError(res, 'Failed to export Excel');
    }
  };
}