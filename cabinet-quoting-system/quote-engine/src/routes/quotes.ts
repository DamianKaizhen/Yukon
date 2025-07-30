import { Router } from 'express';
import { QuoteController } from '@/controllers/QuoteController';
import { validationMiddleware } from '@/middleware/validation';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

const router = Router();
const quoteController = new QuoteController();

// Quote calculation validation schema
const quoteCalculationSchema = {
  customer_id: {
    in: ['body'],
    isUUID: {
      errorMessage: 'Customer ID must be a valid UUID'
    },
    notEmpty: {
      errorMessage: 'Customer ID is required'
    }
  },
  items: {
    in: ['body'],
    isArray: {
      errorMessage: 'Items must be an array',
      options: { min: 1 }
    },
    custom: {
      options: (items: any[]) => {
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('At least one item is required');
        }
        
        items.forEach((item, index) => {
          if (!item.product_variant_id) {
            throw new Error(`Item ${index + 1}: Product variant ID is required`);
          }
          if (!item.box_material_id) {
            throw new Error(`Item ${index + 1}: Box material ID is required`);
          }
          if (!item.quantity || item.quantity <= 0) {
            throw new Error(`Item ${index + 1}: Quantity must be positive`);
          }
          if (item.discount_percent !== undefined && 
              (item.discount_percent < 0 || item.discount_percent > 100)) {
            throw new Error(`Item ${index + 1}: Discount percent must be between 0 and 100`);
          }
        });
        
        return true;
      }
    }
  },
  shipping_address: {
    in: ['body'],
    optional: true,
    isObject: {
      errorMessage: 'Shipping address must be an object'
    }
  },
  apply_tax: {
    in: ['body'],
    optional: true,
    isBoolean: {
      errorMessage: 'Apply tax must be a boolean'
    }
  },
  customer_discount_tier: {
    in: ['body'],
    optional: true,
    isIn: {
      options: [['retail', 'contractor', 'dealer', 'wholesale']],
      errorMessage: 'Invalid customer discount tier'
    }
  },
  notes: {
    in: ['body'],
    optional: true,
    isString: {
      errorMessage: 'Notes must be a string'
    },
    isLength: {
      options: { max: 1000 },
      errorMessage: 'Notes cannot exceed 1000 characters'
    }
  },
  valid_until: {
    in: ['body'],
    optional: true,
    isISO8601: {
      errorMessage: 'Valid until must be a valid ISO8601 date'
    }
  }
};

// PDF generation validation schema
const pdfGenerationSchema = {
  quote_calculation: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Quote calculation is required'
    },
    isObject: {
      errorMessage: 'Quote calculation must be an object'
    }
  },
  template_type: {
    in: ['body'],
    optional: true,
    isIn: {
      options: [['standard', 'detailed', 'summary', 'contractor']],
      errorMessage: 'Invalid template type'
    }
  },
  include_terms: {
    in: ['body'],
    optional: true,
    isBoolean: {
      errorMessage: 'Include terms must be a boolean'
    }
  },
  include_installation_guide: {
    in: ['body'],
    optional: true,
    isBoolean: {
      errorMessage: 'Include installation guide must be a boolean'
    }
  },
  custom_branding: {
    in: ['body'],
    optional: true,
    isObject: {
      errorMessage: 'Custom branding must be an object'
    }
  },
  watermark: {
    in: ['body'],
    optional: true,
    isString: {
      errorMessage: 'Watermark must be a string'
    },
    isLength: {
      options: { max: 50 },
      errorMessage: 'Watermark cannot exceed 50 characters'
    }
  }
};

// Combined schema for calculate-and-pdf endpoint
const calculateAndPdfSchema = {
  ...quoteCalculationSchema,
  template_type: pdfGenerationSchema.template_type,
  include_terms: pdfGenerationSchema.include_terms,
  include_installation_guide: pdfGenerationSchema.include_installation_guide,
  custom_branding: pdfGenerationSchema.custom_branding,
  watermark: pdfGenerationSchema.watermark
};

/**
 * @swagger
 * /api/v1/quotes/calculate:
 *   post:
 *     summary: Calculate quote with pricing, taxes, and shipping
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuoteCalculationRequest'
 *     responses:
 *       200:
 *         description: Quote calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuoteCalculationResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/calculate', 
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 100 requests per minute
  validationMiddleware(quoteCalculationSchema),
  quoteController.calculateQuote
);

/**
 * @swagger
 * /api/v1/quotes/pdf:
 *   post:
 *     summary: Generate PDF for existing quote calculation
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PDFGenerationRequest'
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PDFGenerationResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/pdf',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 50 }), // 50 requests per minute
  validationMiddleware(pdfGenerationSchema),
  quoteController.generatePDF
);

/**
 * @swagger
 * /api/v1/quotes/calculate-and-pdf:
 *   post:
 *     summary: Calculate quote and generate PDF in one request
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalculateAndPDFRequest'
 *     responses:
 *       200:
 *         description: Quote calculated and PDF generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculateAndPDFResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/calculate-and-pdf',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  validationMiddleware(calculateAndPdfSchema),
  quoteController.calculateAndGeneratePDF
);

/**
 * @swagger
 * /api/v1/quotes/breakdown:
 *   post:
 *     summary: Get detailed calculation breakdown for debugging
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuoteCalculationRequest'
 *     responses:
 *       200:
 *         description: Calculation breakdown generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationBreakdownResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/breakdown',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  validationMiddleware(quoteCalculationSchema),
  quoteController.getCalculationBreakdown
);

/**
 * @swagger
 * /api/v1/quotes/validate:
 *   post:
 *     summary: Validate quote calculation request without performing full calculation
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuoteCalculationRequest'
 *     responses:
 *       200:
 *         description: Quote validation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/validate',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 200 }), // 200 requests per minute
  validationMiddleware(quoteCalculationSchema),
  quoteController.validateQuote
);

export default router;