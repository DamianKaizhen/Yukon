import request from 'supertest';
import { Express } from 'express';
import { setupTestEnvironment, teardownTestEnvironment } from '../utils/test-environment';

describe('Customer Quote Journey Integration Tests', () => {
  let backendApp: Express;
  let quoteEngineApp: Express;
  let authToken: string;
  let customerId: number;
  let quoteId: number;

  beforeAll(async () => {
    ({ backendApp, quoteEngineApp } = await setupTestEnvironment());
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('Complete Customer Journey: Registration to PDF Generation', () => {
    it('should complete the full customer journey successfully', async () => {
      // Step 1: Customer Registration
      const registrationData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        phone: '+1234567890',
        companyName: 'Doe Construction'
      };

      const registerResponse = await request(backendApp)
        .post('/api/v1/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data).toHaveProperty('token');
      
      authToken = registerResponse.body.data.token;
      customerId = registerResponse.body.data.user.id;

      // Step 2: Browse Product Catalog
      const catalogResponse = await request(backendApp)
        .get('/api/v1/products')
        .expect(200);

      expect(catalogResponse.body.success).toBe(true);
      expect(catalogResponse.body.data.products).toBeDefined();
      expect(Array.isArray(catalogResponse.body.data.products)).toBe(true);
      expect(catalogResponse.body.data.products.length).toBeGreaterThan(0);

      // Step 3: Search for Specific Products
      const searchResponse = await request(backendApp)
        .get('/api/v1/products/search?q=base cabinet')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.products.length).toBeGreaterThan(0);

      const selectedProducts = searchResponse.body.data.products.slice(0, 3);

      // Step 4: Get Product Details
      for (const product of selectedProducts) {
        const productDetailResponse = await request(backendApp)
          .get(`/api/v1/products/${product.id}`)
          .expect(200);

        expect(productDetailResponse.body.success).toBe(true);
        expect(productDetailResponse.body.data.product.id).toBe(product.id);
      }

      // Step 5: Create Quote with Selected Items
      const quoteData = {
        customerName: registrationData.name,
        customerEmail: registrationData.email,
        customerPhone: registrationData.phone,
        companyName: registrationData.companyName,
        projectName: 'Kitchen Renovation Project',
        projectDescription: 'Complete kitchen cabinet installation with custom specifications',
        items: selectedProducts.map((product, index) => ({
          productId: product.id,
          quantity: index + 1,
          specifications: {
            width: 36 + (index * 6),
            height: 84,
            depth: 24,
            material: 'Solid Wood',
            finish: 'Natural Oak'
          },
          customizations: {
            hardware: 'Soft-close hinges',
            specialInstructions: `Custom installation notes for item ${index + 1}`
          }
        }))
      };

      const createQuoteResponse = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData)
        .expect(201);

      expect(createQuoteResponse.body.success).toBe(true);
      expect(createQuoteResponse.body.data.quote).toHaveProperty('id');
      expect(createQuoteResponse.body.data.quote).toHaveProperty('quoteNumber');
      expect(createQuoteResponse.body.data.quote.status).toBe('draft');
      expect(createQuoteResponse.body.data.quote.items).toHaveLength(3);

      quoteId = createQuoteResponse.body.data.quote.id;

      // Verify calculations
      expect(createQuoteResponse.body.data.quote).toHaveProperty('subtotal');
      expect(createQuoteResponse.body.data.quote).toHaveProperty('taxAmount');
      expect(createQuoteResponse.body.data.quote).toHaveProperty('total');
      expect(createQuoteResponse.body.data.quote.total).toBeGreaterThan(createQuoteResponse.body.data.quote.subtotal);

      // Step 6: Retrieve Created Quote
      const getQuoteResponse = await request(backendApp)
        .get(`/api/v1/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getQuoteResponse.body.success).toBe(true);
      expect(getQuoteResponse.body.data.quote.id).toBe(quoteId);
      expect(getQuoteResponse.body.data.quote.projectName).toBe(quoteData.projectName);

      // Step 7: Update Quote (Add More Items)
      const updateData = {
        items: [
          ...getQuoteResponse.body.data.quote.items,
          {
            productId: selectedProducts[0].id,
            quantity: 2,
            specifications: {
              width: 48,
              height: 84,
              depth: 24,
              material: 'Solid Wood',
              finish: 'Cherry Stain'
            }
          }
        ]
      };

      const updateQuoteResponse = await request(backendApp)
        .put(`/api/v1/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateQuoteResponse.body.success).toBe(true);
      expect(updateQuoteResponse.body.data.quote.items).toHaveLength(4);

      // Step 8: Finalize Quote
      const finalizeResponse = await request(backendApp)
        .patch(`/api/v1/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalizeResponse.body.success).toBe(true);
      expect(finalizeResponse.body.data.quote.status).toBe('finalized');
      expect(finalizeResponse.body.data.quote).toHaveProperty('finalizedAt');

      // Step 9: Generate PDF Quote
      const pdfResponse = await request(quoteEngineApp)
        .post(`/api/v1/quotes/${quoteId}/pdf`)
        .expect(200);

      expect(pdfResponse.body.success).toBe(true);
      expect(pdfResponse.body.data).toHaveProperty('pdfUrl');
      expect(pdfResponse.body.data).toHaveProperty('fileName');
      expect(pdfResponse.body.data.fileName).toMatch(/\.pdf$/);

      // Step 10: Download PDF
      const pdfUrl = pdfResponse.body.data.pdfUrl;
      const downloadResponse = await request(quoteEngineApp)
        .get(pdfUrl)
        .expect(200);

      expect(downloadResponse.headers['content-type']).toBe('application/pdf');
      expect(downloadResponse.body.length).toBeGreaterThan(0);

      // Step 11: Email Quote (Optional)
      const emailData = {
        recipientEmail: registrationData.email,
        subject: 'Your Cabinet Quote',
        message: 'Please find your cabinet quote attached.'
      };

      const emailResponse = await request(quoteEngineApp)
        .post(`/api/v1/quotes/${quoteId}/email`)
        .send(emailData)
        .expect(200);

      expect(emailResponse.body.success).toBe(true);
      expect(emailResponse.body.message).toContain('sent successfully');
    });
  });

  describe('Customer Authentication Flow', () => {
    it('should handle login after registration', async () => {
      const credentials = {
        email: 'john.doe@example.com',
        password: 'SecurePass123!'
      };

      const loginResponse = await request(backendApp)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('token');
      expect(loginResponse.body.data.user.email).toBe(credentials.email);
    });

    it('should protect quote routes with authentication', async () => {
      // Try to access quotes without token
      await request(backendApp)
        .get('/api/v1/quotes')
        .expect(401);

      // Try to create quote without token
      await request(backendApp)
        .post('/api/v1/quotes')
        .send({ customerName: 'Test' })
        .expect(401);
    });

    it('should allow token refresh', async () => {
      const refreshResponse = await request(backendApp)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('token');
    });
  });

  describe('Quote Management Workflow', () => {
    let testQuoteId: number;

    beforeEach(async () => {
      // Create a test quote
      const quoteData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        projectName: 'Test Project',
        items: [{
          productId: 1,
          quantity: 1,
          specifications: { width: 36, height: 84, depth: 24 }
        }]
      };

      const response = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData);

      testQuoteId = response.body.data.quote.id;
    });

    it('should list customer quotes with pagination', async () => {
      const response = await request(backendApp)
        .get('/api/v1/quotes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('quotes');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter quotes by status', async () => {
      const response = await request(backendApp)
        .get('/api/v1/quotes?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.quotes.forEach((quote: any) => {
        expect(quote.status).toBe('draft');
      });
    });

    it('should prevent editing finalized quotes', async () => {
      // Finalize the quote first
      await request(backendApp)
        .patch(`/api/v1/quotes/${testQuoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to update finalized quote
      const updateResponse = await request(backendApp)
        .put(`/api/v1/quotes/${testQuoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectName: 'Updated Name' })
        .expect(400);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toContain('finalized');
    });

    it('should delete draft quotes only', async () => {
      // Delete draft quote should work
      await request(backendApp)
        .delete(`/api/v1/quotes/${testQuoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify quote is deleted
      await request(backendApp)
        .get(`/api/v1/quotes/${testQuoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Product Catalog Interaction', () => {
    it('should handle product search with various filters', async () => {
      const searchTests = [
        { query: '?category=Kitchen%20Cabinets', expectedField: 'category' },
        { query: '?subcategory=Base%20Cabinets', expectedField: 'subcategory' },
        { query: '?minPrice=100&maxPrice=500', priceRange: true },
        { query: '?sortBy=price&sortOrder=asc', sorted: true }
      ];

      for (const test of searchTests) {
        const response = await request(backendApp)
          .get(`/api/v1/products${test.query}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.products)).toBe(true);

        if (test.priceRange) {
          response.body.data.products.forEach((product: any) => {
            expect(product.price).toBeGreaterThanOrEqual(100);
            expect(product.price).toBeLessThanOrEqual(500);
          });
        }

        if (test.sorted) {
          const prices = response.body.data.products.map((p: any) => p.price);
          for (let i = 1; i < prices.length; i++) {
            expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
          }
        }
      }
    });

    it('should retrieve product categories', async () => {
      const response = await request(backendApp)
        .get('/api/v1/products/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      
      if (response.body.data.categories.length > 0) {
        const category = response.body.data.categories[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('subcategories');
        expect(Array.isArray(category.subcategories)).toBe(true);
      }
    });

    it('should handle featured products', async () => {
      const response = await request(backendApp)
        .get('/api/v1/products/featured')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products.length).toBeLessThanOrEqual(12);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid quote data gracefully', async () => {
      const invalidQuoteData = {
        customerName: '',
        customerEmail: 'invalid-email',
        items: []
      };

      const response = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidQuoteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should handle non-existent product IDs in quotes', async () => {
      const invalidQuoteData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        projectName: 'Test Project',
        items: [{
          productId: 99999, // Non-existent product
          quantity: 1,
          specifications: { width: 36, height: 84, depth: 24 }
        }]
      };

      const response = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidQuoteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('product');
    });

    it('should handle PDF generation failures gracefully', async () => {
      // Create a quote first
      const quoteData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        projectName: 'Test Project',
        items: [{
          productId: 1,
          quantity: 1,
          specifications: { width: 36, height: 84, depth: 24 }
        }]
      };

      const quoteResponse = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData);

      const quoteId = quoteResponse.body.data.quote.id;

      // Try to generate PDF for non-finalized quote
      const pdfResponse = await request(quoteEngineApp)
        .post(`/api/v1/quotes/${quoteId}/pdf`)
        .expect(400);

      expect(pdfResponse.body.success).toBe(false);
      expect(pdfResponse.body.message).toContain('finalized');
    });

    it('should handle concurrent quote modifications', async () => {
      // Create a quote
      const quoteData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890',
        projectName: 'Test Project',
        items: [{
          productId: 1,
          quantity: 1,
          specifications: { width: 36, height: 84, depth: 24 }
        }]
      };

      const quoteResponse = await request(backendApp)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData);

      const quoteId = quoteResponse.body.data.quote.id;

      // Simulate concurrent updates
      const update1 = request(backendApp)
        .put(`/api/v1/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectName: 'Updated Project 1' });

      const update2 = request(backendApp)
        .put(`/api/v1/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectName: 'Updated Project 2' });

      const results = await Promise.allSettled([update1, update2]);

      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(1);
    });
  });
});