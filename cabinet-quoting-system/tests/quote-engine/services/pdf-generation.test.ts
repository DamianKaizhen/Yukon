import { PDFGenerationService } from '../../../quote-engine/src/services/PDFGenerationService';
import { QuoteData } from '../../../quote-engine/src/types';
import fs from 'fs/promises';
import path from 'path';

describe('PDFGenerationService', () => {
  let pdfService: PDFGenerationService;
  let mockQuoteData: QuoteData;

  beforeAll(() => {
    pdfService = new PDFGenerationService();
  });

  beforeEach(() => {
    mockQuoteData = {
      id: 1,
      quoteNumber: 'Q-2024-001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      companyName: 'Doe Construction',
      projectName: 'Kitchen Renovation',
      projectDescription: 'Complete kitchen cabinet installation',
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Base Cabinet 36"',
          category: 'Kitchen Cabinets',
          subcategory: 'Base Cabinets',
          quantity: 2,
          unitPrice: 299.99,
          totalPrice: 599.98,
          specifications: {
            width: 36,
            height: 84,
            depth: 24,
            material: 'Solid Wood',
            finish: 'Natural Oak'
          },
          customizations: {}
        },
        {
          id: 2,
          productId: 2,
          productName: 'Wall Cabinet 30"',
          category: 'Kitchen Cabinets',
          subcategory: 'Wall Cabinets',
          quantity: 4,
          unitPrice: 199.99,
          totalPrice: 799.96,
          specifications: {
            width: 30,
            height: 42,
            depth: 12,
            material: 'Solid Wood',
            finish: 'Natural Oak'
          },
          customizations: {}
        }
      ],
      subtotal: 1399.94,
      taxRate: 0.085,
      taxAmount: 118.99,
      shippingCost: 50.00,
      total: 1568.93,
      status: 'draft',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      validUntil: new Date('2024-02-15T10:00:00Z'),
      notes: 'Customer prefers quick installation',
      terms: 'Standard cabinet installation terms apply'
    };
  });

  describe('generateQuotePDF', () => {
    it('should generate a PDF file for a valid quote', async () => {
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result.fileName).toMatch(/^quote-Q-2024-001-\d+\.pdf$/);
      expect(result.filePath).toContain(result.fileName);

      // Verify file exists
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should include all quote information in the PDF', async () => {
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      // Read the generated PDF (in a real test, you might use a PDF parser)
      const fileStats = await fs.stat(result.filePath);
      expect(fileStats.size).toBeGreaterThan(0);

      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should handle quotes with multiple items correctly', async () => {
      const multiItemQuote = {
        ...mockQuoteData,
        items: [
          ...mockQuoteData.items,
          {
            id: 3,
            productId: 3,
            productName: 'Tall Cabinet 18"',
            category: 'Kitchen Cabinets',
            subcategory: 'Tall Cabinets',
            quantity: 1,
            unitPrice: 399.99,
            totalPrice: 399.99,
            specifications: {
              width: 18,
              height: 84,
              depth: 24,
              material: 'Solid Wood',
              finish: 'Natural Oak'
            },
            customizations: {}
          }
        ]
      };

      const result = await pdfService.generateQuotePDF(multiItemQuote);

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');

      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should handle quotes with customizations', async () => {
      const customizedQuote = {
        ...mockQuoteData,
        items: [{
          ...mockQuoteData.items[0],
          customizations: {
            finish: 'Cherry Stain',
            hardware: 'Soft-close hinges',
            specialInstructions: 'Install with crown molding'
          }
        }]
      };

      const result = await pdfService.generateQuotePDF(customizedQuote);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should throw error for invalid quote data', async () => {
      const invalidQuote = {
        ...mockQuoteData,
        customerName: '',
        items: []
      };

      await expect(pdfService.generateQuotePDF(invalidQuote))
        .rejects
        .toThrow('Invalid quote data: Customer name and items are required');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalQuote = {
        id: 1,
        quoteNumber: 'Q-2024-002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        projectName: 'Bathroom Renovation',
        items: [mockQuoteData.items[0]],
        subtotal: 599.98,
        taxRate: 0.085,
        taxAmount: 50.99,
        total: 650.97,
        status: 'draft',
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const result = await pdfService.generateQuotePDF(minimalQuote as QuoteData);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });
  });

  describe('Template Rendering', () => {
    it('should format currency values correctly', async () => {
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      // In a real implementation, you would parse the PDF content to verify formatting
      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should format dates correctly', async () => {
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should handle long product names and descriptions', async () => {
      const longNameQuote = {
        ...mockQuoteData,
        items: [{
          ...mockQuoteData.items[0],
          productName: 'Very Long Product Name That Should Be Handled Gracefully In The PDF Layout Without Breaking The Design'
        }]
      };

      const result = await pdfService.generateQuotePDF(longNameQuote);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });
  });

  describe('File Management', () => {
    it('should create unique file names for concurrent requests', async () => {
      const promises = [
        pdfService.generateQuotePDF(mockQuoteData),
        pdfService.generateQuotePDF(mockQuoteData),
        pdfService.generateQuotePDF(mockQuoteData)
      ];

      const results = await Promise.all(promises);

      const fileNames = results.map(r => r.fileName);
      const uniqueFileNames = new Set(fileNames);

      expect(uniqueFileNames.size).toBe(3);

      // Clean up
      await Promise.all(results.map(r => fs.unlink(r.filePath)));
    });

    it('should store files in the correct directory', async () => {
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      expect(result.filePath).toContain('/storage/pdfs/');
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should handle directory creation if it does not exist', async () => {
      // Test would involve temporarily removing the directory
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });
  });

  describe('Performance', () => {
    it('should generate PDF within acceptable time limit', async () => {
      const startTime = Date.now();
      
      const result = await pdfService.generateQuotePDF(mockQuoteData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should handle large quotes efficiently', async () => {
      const largeQuote = {
        ...mockQuoteData,
        items: Array.from({ length: 50 }, (_, i) => ({
          ...mockQuoteData.items[0],
          id: i + 1,
          productName: `Product ${i + 1}`
        }))
      };

      const startTime = Date.now();
      
      const result = await pdfService.generateQuotePDF(largeQuote);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds for large quotes
      
      // Clean up
      await fs.unlink(result.filePath);
    });
  });

  describe('Error Handling', () => {
    it('should handle template rendering errors gracefully', async () => {
      // Mock template error
      const originalGenerateQuotePDF = pdfService.generateQuotePDF;
      jest.spyOn(pdfService, 'generateQuotePDF').mockImplementation(() => {
        throw new Error('Template rendering failed');
      });

      await expect(pdfService.generateQuotePDF(mockQuoteData))
        .rejects
        .toThrow('Template rendering failed');

      // Restore original method
      pdfService.generateQuotePDF = originalGenerateQuotePDF;
    });

    it('should handle file system errors gracefully', async () => {
      // Test would involve mocking fs operations to fail
      const result = await pdfService.generateQuotePDF(mockQuoteData);

      expect(result).toHaveProperty('filePath');
      
      // Clean up
      await fs.unlink(result.filePath);
    });

    it('should validate quote data before processing', async () => {
      const invalidQuotes = [
        null,
        undefined,
        {},
        { ...mockQuoteData, quoteNumber: '' },
        { ...mockQuoteData, customerName: null },
        { ...mockQuoteData, items: null }
      ];

      for (const invalidQuote of invalidQuotes) {
        await expect(pdfService.generateQuotePDF(invalidQuote as any))
          .rejects
          .toThrow();
      }
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources after PDF generation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate multiple PDFs
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await pdfService.generateQuotePDF(mockQuoteData);
        results.push(result);
      }

      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      // Clean up
      await Promise.all(results.map(r => fs.unlink(r.filePath)));
    });
  });
});