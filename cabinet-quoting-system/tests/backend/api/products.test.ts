import request from 'supertest';
import express from 'express';
import productRoutes from '../../../backend/src/routes/products';

describe('Products API Endpoints', () => {
  let app: express.Application;
  let authToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/products', productRoutes);

    // Setup authentication token for protected routes
    // In a real test, this would use a test user
    authToken = 'test-jwt-token';
  });

  describe('GET /products', () => {
    it('should retrieve all products', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/products?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/products?category=Kitchen%20Cabinets')
        .expect(200);

      expect(response.body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringContaining('Kitchen')
          })
        ])
      );
    });

    it('should filter products by subcategory', async () => {
      const response = await request(app)
        .get('/products?subcategory=Base%20Cabinets')
        .expect(200);

      expect(response.body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subcategory: expect.stringContaining('Base')
          })
        ])
      );
    });

    it('should search products by name', async () => {
      const response = await request(app)
        .get('/products?search=cabinet')
        .expect(200);

      expect(response.body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/cabinet/i)
          })
        ])
      );
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/products?minPrice=100&maxPrice=500')
        .expect(200);

      expect(response.body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            price: expect.any(Number)
          })
        ])
      );

      // Verify all products are within price range
      response.body.data.products.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(100);
        expect(product.price).toBeLessThanOrEqual(500);
      });
    });

    it('should sort products by price ascending', async () => {
      const response = await request(app)
        .get('/products?sortBy=price&sortOrder=asc')
        .expect(200);

      const products = response.body.data.products;
      for (let i = 1; i < products.length; i++) {
        expect(products[i].price).toBeGreaterThanOrEqual(products[i - 1].price);
      }
    });

    it('should sort products by price descending', async () => {
      const response = await request(app)
        .get('/products?sortBy=price&sortOrder=desc')
        .expect(200);

      const products = response.body.data.products;
      for (let i = 1; i < products.length; i++) {
        expect(products[i].price).toBeLessThanOrEqual(products[i - 1].price);
      }
    });
  });

  describe('GET /products/:id', () => {
    it('should retrieve a specific product by ID', async () => {
      const response = await request(app)
        .get('/products/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('product');
      expect(response.body.data.product).toHaveProperty('id', 1);
      expect(response.body.data.product).toHaveProperty('name');
      expect(response.body.data.product).toHaveProperty('price');
      expect(response.body.data.product).toHaveProperty('category');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/products/99999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Product not found');
    });

    it('should validate product ID format', async () => {
      const response = await request(app)
        .get('/products/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid product ID');
    });
  });

  describe('GET /products/categories', () => {
    it('should retrieve all product categories', async () => {
      const response = await request(app)
        .get('/products/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should include subcategories for each category', async () => {
      const response = await request(app)
        .get('/products/categories')
        .expect(200);

      const categories = response.body.data.categories;
      categories.forEach((category: any) => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('subcategories');
        expect(Array.isArray(category.subcategories)).toBe(true);
      });
    });
  });

  describe('GET /products/search', () => {
    it('should search products with query parameter', async () => {
      const response = await request(app)
        .get('/products/search?q=cabinet')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('query', 'cabinet');
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/products/search?q=nonexistentproduct123')
        .expect(200);

      expect(response.body.data.products).toHaveLength(0);
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/products/search')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('query parameter is required');
    });
  });

  describe('GET /products/featured', () => {
    it('should retrieve featured products', async () => {
      const response = await request(app)
        .get('/products/featured')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should limit featured products to reasonable number', async () => {
      const response = await request(app)
        .get('/products/featured')
        .expect(200);

      expect(response.body.data.products.length).toBeLessThanOrEqual(12);
    });
  });

  describe('Product data validation', () => {
    it('should return products with required fields', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      if (response.body.data.products.length > 0) {
        const product = response.body.data.products[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('subcategory');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('specifications');
      }
    });

    it('should return numeric prices', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      response.body.data.products.forEach((product: any) => {
        expect(typeof product.price).toBe('number');
        expect(product.price).toBeGreaterThan(0);
      });
    });

    it('should return valid dimensions in specifications', async () => {
      const response = await request(app)
        .get('/products')
        .expect(200);

      response.body.data.products.forEach((product: any) => {
        if (product.specifications) {
          expect(product.specifications).toHaveProperty('width');
          expect(product.specifications).toHaveProperty('height');
          expect(product.specifications).toHaveProperty('depth');
        }
      });
    });
  });
});