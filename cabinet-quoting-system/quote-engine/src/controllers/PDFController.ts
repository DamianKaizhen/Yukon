import { Request, Response } from 'express';
import { APIResponse, ValidationError, PDFGenerationError } from '@/types';
import { PDFGenerationService } from '@/services/PDFGenerationService';
import { Logger } from '@/utils/Logger';

export class PDFController {
  private pdfService: PDFGenerationService;
  private logger: Logger;

  constructor() {
    this.pdfService = new PDFGenerationService();
    this.logger = Logger.getInstance();
  }

  /**
   * Download PDF by ID
   * GET /api/v1/pdfs/:pdfId/download
   */
  public downloadPDF = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `download-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      const { pdfId } = req.params;

      if (!pdfId) {
        throw new ValidationError('PDF ID is required');
      }

      this.logger.info('PDF download request received', { pdfId });

      // Get PDF file
      const pdfBuffer = await this.pdfService.getPDFFile(pdfId);

      if (!pdfBuffer) {
        const response: APIResponse = {
          success: false,
          message: 'PDF not found',
          errors: ['The requested PDF file could not be found']
        };

        res.status(404).json(response);
        return;
      }

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quote-${pdfId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send PDF
      res.send(pdfBuffer);

      this.logger.info('PDF downloaded successfully', { 
        pdfId, 
        fileSize: pdfBuffer.length 
      });

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * View PDF in browser (inline)
   * GET /api/v1/pdfs/:pdfId/view
   */
  public viewPDF = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `view-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      const { pdfId } = req.params;

      if (!pdfId) {
        throw new ValidationError('PDF ID is required');
      }

      this.logger.info('PDF view request received', { pdfId });

      // Get PDF file
      const pdfBuffer = await this.pdfService.getPDFFile(pdfId);

      if (!pdfBuffer) {
        const response: APIResponse = {
          success: false,
          message: 'PDF not found',
          errors: ['The requested PDF file could not be found']
        };

        res.status(404).json(response);
        return;
      }

      // Set response headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="quote-${pdfId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Send PDF
      res.send(pdfBuffer);

      this.logger.info('PDF viewed successfully', { 
        pdfId, 
        fileSize: pdfBuffer.length 
      });

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Get PDF metadata
   * GET /api/v1/pdfs/:pdfId/info
   */
  public getPDFInfo = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `info-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      const { pdfId } = req.params;

      if (!pdfId) {
        throw new ValidationError('PDF ID is required');
      }

      this.logger.info('PDF info request received', { pdfId });

      // Check if PDF exists
      const pdfBuffer = await this.pdfService.getPDFFile(pdfId);

      if (!pdfBuffer) {
        const response: APIResponse = {
          success: false,
          message: 'PDF not found',
          errors: ['The requested PDF file could not be found']
        };

        res.status(404).json(response);
        return;
      }

      // Get PDF info (this would typically come from a database in a real system)
      const pdfInfo = {
        pdf_id: pdfId,
        file_size: pdfBuffer.length,
        created_at: new Date().toISOString(), // Would be actual creation time
        status: 'available',
        download_url: `/api/v1/pdfs/${pdfId}/download`,
        view_url: `/api/v1/pdfs/${pdfId}/view`
      };

      const response: APIResponse = {
        success: true,
        data: pdfInfo,
        message: 'PDF info retrieved successfully'
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Clean up old PDFs
   * DELETE /api/v1/pdfs/cleanup
   */
  public cleanupOldPDFs = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `cleanup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('PDF cleanup request received');

      // Perform cleanup
      await this.pdfService.cleanupOldPDFs();

      const response: APIResponse = {
        success: true,
        message: 'PDF cleanup completed successfully'
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Handle errors and send appropriate response
   */
  private handleError(error: any, res: Response, correlationId?: string): void {
    this.logger.error('PDF request failed', { 
      error: error.message,
      stack: error.stack,
      correlationId
    });

    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error instanceof PDFGenerationError) {
      statusCode = 500;
      errorCode = 'PDF_ERROR';
      message = error.message;
    } else if (error.statusCode) {
      statusCode = error.statusCode;
      errorCode = error.errorCode || 'API_ERROR';
      message = error.message;
    }

    const response: APIResponse = {
      success: false,
      message,
      errors: [message],
      meta: {
        error_code: errorCode,
        correlation_id: correlationId,
        timestamp: new Date().toISOString()
      }
    };

    res.status(statusCode).json(response);
  }
}