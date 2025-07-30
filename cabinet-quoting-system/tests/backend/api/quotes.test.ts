import request from 'supertest';
import express from 'express';
import quoteRoutes from '../../../backend/src/routes/quotes';

describe('Quotes API Endpoints', () => {
  let app: express.Application;
  let authToken: string;
  let customerId: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/quotes', quoteRoutes);

    // Setup test customer and auth token
    authToken = 'test-jwt-token';
    customerId = 1;
  });

  describe('POST /quotes', () => {
    const validQuoteData = {
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      customerPhone: '+1234567890',
      projectName: 'Kitchen Renovation',
      items: [
        {
          productId: 1,
          quantity: 2,
          specifications: {
            width: 36,
            height: 84,
            depth: 24
          }
        },
        {
          productId: 2,
          quantity: 1,
          specifications: {
            width: 48,
            height: 84,
            depth: 24
          }
        }
      ]
    };

    it('should create a new quote successfully', async () => {
      const response = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validQuoteData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quote');
      expect(response.body.data.quote).toHaveProperty('id');
      expect(response.body.data.quote).toHaveProperty('quoteNumber');
      expect(response.body.data.quote).toHaveProperty('status', 'draft');
      expect(response.body.data.quote).toHaveProperty('items');
      expect(response.body.data.quote.items).toHaveLength(2);
    });

    it('should calculate quote totals correctly', async () => {
      const response = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validQuoteData)
        .expect(201);

      const quote = response.body.data.quote;
      expect(quote).toHaveProperty('subtotal');
      expect(quote).toHaveProperty('tax');
      expect(quote).toHaveProperty('total');
      expect(typeof quote.subtotal).toBe('number');
      expect(typeof quote.tax).toBe('number');
      expect(typeof quote.total).toBe('number');
      expect(quote.total).toBeGreaterThan(quote.subtotal);
    });

    it('should reject quote with invalid customer data', async () => {
      const invalidData = {
        ...validQuoteData,
        customerEmail: 'invalid-email'
      };

      const response = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('email');
    });

    it('should reject quote without items', async () => {
      const invalidData = {
        ...validQuoteData,
        items: []
      };

      const response = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('items');
    });

    it('should reject quote with invalid product IDs', async () => {
      const invalidData = {
        ...validQuoteData,
        items: [{
          productId: 99999,
          quantity: 1,
          specifications: { width: 36, height: 84, depth: 24 }
        }]
      };

      const response = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('product');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/quotes')
        .send(validQuoteData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /quotes', () => {
    beforeEach(async () => {
      // Create test quotes
      await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer 1',
          customerEmail: 'customer1@example.com',
          customerPhone: '+1234567890',
          projectName: 'Project 1',
          items: [{ productId: 1, quantity: 1, specifications: { width: 36, height: 84, depth: 24 } }]
        });
    });

    it('should retrieve customer quotes', async () => {
      const response = await request(app)
        .get('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quotes');
      expect(Array.isArray(response.body.data.quotes)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/quotes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('quotes');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter quotes by status', async () => {
      const response = await request(app)
        .get('/quotes?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.quotes.forEach((quote: any) => {
        expect(quote.status).toBe('draft');
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/quotes')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /quotes/:id', () => {
    let quoteId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          projectName: 'Test Project',
          items: [{ productId: 1, quantity: 1, specifications: { width: 36, height: 84, depth: 24 } }]
        });

      quoteId = createResponse.body.data.quote.id;
    });

    it('should retrieve a specific quote', async () => {
      const response = await request(app)
        .get(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quote');
      expect(response.body.data.quote).toHaveProperty('id', quoteId);
    });

    it('should return 404 for non-existent quote', async () => {
      const response = await request(app)
        .get('/quotes/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/quotes/${quoteId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /quotes/:id', () => {
    let quoteId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          projectName: 'Test Project',
          items: [{ productId: 1, quantity: 1, specifications: { width: 36, height: 84, depth: 24 } }]
        });

      quoteId = createResponse.body.data.quote.id;
    });

    it('should update a quote successfully', async () => {
      const updateData = {
        projectName: 'Updated Project Name',
        items: [
          { productId: 1, quantity: 2, specifications: { width: 36, height: 84, depth: 24 } },
          { productId: 2, quantity: 1, specifications: { width: 48, height: 84, depth: 24 } }
        ]
      };

      const response = await request(app)
        .put(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.quote).toHaveProperty('projectName', updateData.projectName);
      expect(response.body.data.quote.items).toHaveLength(2);
    });

    it('should recalculate totals after update', async () => {
      const updateData = {
        items: [
          { productId: 1, quantity: 5, specifications: { width: 36, height: 84, depth: 24 } }
        ]
      };

      const response = await request(app)
        .put(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.quote).toHaveProperty('subtotal');
      expect(response.body.data.quote).toHaveProperty('total');
    });

    it('should not allow updating finalized quotes', async () => {
      // First finalize the quote
      await request(app)
        .patch(`/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .put(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectName: 'Should not update' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('finalized');
    });
  });

  describe('PATCH /quotes/:id/finalize', () => {
    let quoteId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          projectName: 'Test Project',
          items: [{ productId: 1, quantity: 1, specifications: { width: 36, height: 84, depth: 24 } }]
        });

      quoteId = createResponse.body.data.quote.id;
    });

    it('should finalize a quote successfully', async () => {
      const response = await request(app)
        .patch(`/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.quote).toHaveProperty('status', 'finalized');
      expect(response.body.data.quote).toHaveProperty('finalizedAt');
    });

    it('should not allow finalizing already finalized quote', async () => {
      // First finalize
      await request(app)
        .patch(`/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to finalize again
      const response = await request(app)
        .patch(`/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already finalized');
    });
  });

  describe('DELETE /quotes/:id', () => {
    let quoteId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '+1234567890',
          projectName: 'Test Project',
          items: [{ productId: 1, quantity: 1, specifications: { width: 36, height: 84, depth: 24 } }]
        });

      quoteId = createResponse.body.data.quote.id;
    });

    it('should delete a draft quote successfully', async () => {
      const response = await request(app)
        .delete(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should not allow deleting finalized quotes', async () => {
      // First finalize the quote
      await request(app)
        .patch(`/quotes/${quoteId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .delete(`/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('finalized');
    });
  });
});