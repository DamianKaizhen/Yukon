import { Request, Response } from 'express';
import {
  QuoteCalculationRequest,
  APIResponse,
  ValidationError,
  CalculationError,
  PDFGenerationRequest,
  PDFTemplateType
} from '@/types';
import { CalculationEngine } from '@/services/CalculationEngine';
import { PDFGenerationService } from '@/services/PDFGenerationService';
import { Logger } from '@/utils/Logger';

export class QuoteController {
  private calculationEngine: CalculationEngine;
  private pdfService: PDFGenerationService;
  private logger: Logger;

  constructor() {
    this.calculationEngine = new CalculationEngine();
    this.pdfService = new PDFGenerationService();
    this.logger = Logger.getInstance();
  }

  /**
   * Calculate quote
   * POST /api/v1/quotes/calculate
   */
  public calculateQuote = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `calc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Quote calculation request received', {
        customerId: req.body.customer_id,
        itemCount: req.body.items?.length
      });

      // Validate request body
      if (!req.body) {
        throw new ValidationError('Request body is required');
      }

      const calculationRequest: QuoteCalculationRequest = req.body;

      // Perform calculation
      const calculation = await this.calculationEngine.calculateQuote(calculationRequest);

      const processingTime = Date.now() - startTime;
      this.logger.performance('quote_calculation', processingTime, {
        customerId: calculation.customer.id,
        totalAmount: calculation.total_amount,
        itemCount: calculation.line_items.length
      });

      const response: APIResponse = {
        success: true,
        data: calculation,
        message: 'Quote calculated successfully',
        meta: {
          processing_time: processingTime,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Generate PDF for quote
   * POST /api/v1/quotes/pdf
   */
  public generatePDF = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('PDF generation request received', {
        templateType: req.body.template_type,
        customerId: req.body.quote_calculation?.customer?.id
      });

      // Validate request body
      if (!req.body || !req.body.quote_calculation) {
        throw new ValidationError('Quote calculation data is required');
      }

      const pdfRequest: PDFGenerationRequest = {
        quote_calculation: req.body.quote_calculation,
        template_type: req.body.template_type || PDFTemplateType.STANDARD,
        include_terms: req.body.include_terms !== false, // Default to true
        include_installation_guide: req.body.include_installation_guide || false,
        custom_branding: req.body.custom_branding,
        watermark: req.body.watermark
      };

      // Generate PDF
      const pdfResult = await this.pdfService.generateQuotePDF(pdfRequest);

      const processingTime = Date.now() - startTime;
      this.logger.performance('pdf_generation', processingTime, {
        pdfId: pdfResult.pdf_id,
        fileSize: pdfResult.file_size,
        pages: pdfResult.pages
      });

      const response: APIResponse = {
        success: true,
        data: pdfResult,
        message: 'PDF generated successfully',
        meta: {
          processing_time: processingTime,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Calculate and generate PDF in one request
   * POST /api/v1/quotes/calculate-and-pdf
   */
  public calculateAndGeneratePDF = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `calc-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Calculate and PDF generation request received', {
        customerId: req.body.customer_id,
        itemCount: req.body.items?.length,
        templateType: req.body.template_type
      });

      // Validate request body
      if (!req.body) {
        throw new ValidationError('Request body is required');
      }

      const calculationRequest: QuoteCalculationRequest = {
        customer_id: req.body.customer_id,
        items: req.body.items,
        shipping_address: req.body.shipping_address,
        apply_tax: req.body.apply_tax,
        customer_discount_tier: req.body.customer_discount_tier,
        notes: req.body.notes,
        valid_until: req.body.valid_until
      };

      // Perform calculation
      const calculation = await this.calculationEngine.calculateQuote(calculationRequest);

      // Generate PDF
      const pdfRequest: PDFGenerationRequest = {
        quote_calculation: calculation,
        template_type: req.body.template_type || PDFTemplateType.STANDARD,
        include_terms: req.body.include_terms !== false,
        include_installation_guide: req.body.include_installation_guide || false,
        custom_branding: req.body.custom_branding,
        watermark: req.body.watermark
      };

      const pdfResult = await this.pdfService.generateQuotePDF(pdfRequest);

      const processingTime = Date.now() - startTime;
      this.logger.performance('calculate_and_pdf', processingTime, {
        customerId: calculation.customer.id,
        totalAmount: calculation.total_amount,
        pdfId: pdfResult.pdf_id
      });

      const response: APIResponse = {
        success: true,
        data: {
          calculation,
          pdf: pdfResult
        },
        message: 'Quote calculated and PDF generated successfully',
        meta: {
          processing_time: processingTime,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Get calculation breakdown for debugging
   * POST /api/v1/quotes/breakdown
   */
  public getCalculationBreakdown = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `breakdown-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Calculation breakdown request received', {
        customerId: req.body.customer_id,
        itemCount: req.body.items?.length
      });

      // Validate request body
      if (!req.body) {
        throw new ValidationError('Request body is required');
      }

      const calculationRequest: QuoteCalculationRequest = req.body;

      // Get breakdown
      const breakdown = await this.calculationEngine.getCalculationBreakdown(calculationRequest);

      const processingTime = Date.now() - startTime;
      this.logger.performance('calculation_breakdown', processingTime);

      const response: APIResponse = {
        success: true,
        data: breakdown,
        message: 'Calculation breakdown generated successfully',
        meta: {
          processing_time: processingTime,
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error) {
      this.handleError(error, res, correlationId);
    } finally {
      this.logger.clearCorrelationId();
    }
  };

  /**
   * Validate quote calculation request
   * POST /api/v1/quotes/validate
   */
  public validateQuote = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         `validate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Quote validation request received', {
        customerId: req.body.customer_id,
        itemCount: req.body.items?.length
      });

      // Validate request body
      if (!req.body) {
        throw new ValidationError('Request body is required');
      }

      const calculationRequest: QuoteCalculationRequest = req.body;

      // Perform dry-run calculation to validate
      try {
        await this.calculationEngine.calculateQuote(calculationRequest);
        
        const response: APIResponse = {
          success: true,
          data: { valid: true },
          message: 'Quote validation successful'
        };

        res.status(200).json(response);

      } catch (validationError) {
        const response: APIResponse = {
          success: false,
          data: { valid: false },
          message: 'Quote validation failed',
          errors: [validationError.message]
        };

        res.status(400).json(response);
      }

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
    this.logger.error('Request failed', { 
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
    } else if (error instanceof CalculationError) {
      statusCode = 400;
      errorCode = 'CALCULATION_ERROR';
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