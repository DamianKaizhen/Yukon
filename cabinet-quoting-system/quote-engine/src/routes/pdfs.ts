import { Router } from 'express';
import { PDFController } from '@/controllers/PDFController';
import { rateLimitMiddleware } from '@/middleware/rateLimit';
import { param } from 'express-validator';

const router = Router();
const pdfController = new PDFController();

// PDF ID validation
const pdfIdValidation = [
  param('pdfId')
    .notEmpty()
    .withMessage('PDF ID is required')
    .matches(/^[\w-]+$/)
    .withMessage('PDF ID must contain only alphanumeric characters, hyphens, and underscores')
    .isLength({ min: 10, max: 50 })
    .withMessage('PDF ID must be between 10 and 50 characters')
];

/**
 * @swagger
 * /api/v1/pdfs/{pdfId}/download:
 *   get:
 *     summary: Download PDF file
 *     tags: [PDFs]
 *     parameters:
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: PDF not found
 *       500:
 *         description: Internal server error
 */
router.get('/:pdfId/download',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 100 downloads per minute
  ...pdfIdValidation,
  pdfController.downloadPDF
);

/**
 * @swagger
 * /api/v1/pdfs/{pdfId}/view:
 *   get:
 *     summary: View PDF file in browser
 *     tags: [PDFs]
 *     parameters:
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF file for inline viewing
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: PDF not found
 *       500:
 *         description: Internal server error
 */
router.get('/:pdfId/view',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 100 }), // 100 views per minute
  ...pdfIdValidation,
  pdfController.viewPDF
);

/**
 * @swagger
 * /api/v1/pdfs/{pdfId}/info:
 *   get:
 *     summary: Get PDF metadata and information
 *     tags: [PDFs]
 *     parameters:
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *         description: The PDF ID
 *     responses:
 *       200:
 *         description: PDF information retrieved successfully
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
 *                     pdf_id:
 *                       type: string
 *                     file_size:
 *                       type: number
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       enum: [available, expired, deleted]
 *                     download_url:
 *                       type: string
 *                     view_url:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: PDF not found
 *       500:
 *         description: Internal server error
 */
router.get('/:pdfId/info',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 200 }), // 200 info requests per minute
  ...pdfIdValidation,
  pdfController.getPDFInfo
);

/**
 * @swagger
 * /api/v1/pdfs/cleanup:
 *   delete:
 *     summary: Clean up old PDF files (admin operation)
 *     tags: [PDFs]
 *     responses:
 *       200:
 *         description: PDF cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.delete('/cleanup',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 5 }), // 5 cleanup requests per minute
  pdfController.cleanupOldPDFs
);

export default router;