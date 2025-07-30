import { Express } from 'express';
import request from 'supertest';

// Mock backend app
export const createMockBackendApp = (): Express => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());

  // Mock authentication endpoints
  app.post('/api/v1/auth/register', (req, res) => {
    if (!req.body.email || !req.body.password || !req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (req.body.email === 'existing@example.com') {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: 1,
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          companyName: req.body.companyName
        },
        token: 'mock-jwt-token-123'
      }
    });
  });

  app.post('/api/v1/auth/login', (req, res) => {
    if (req.body.email === 'john.doe@example.com' && req.body.password === 'SecurePass123!') {
      res.json({
        success: true,
        data: {
          user: {
            id: 1,
            name: 'John Doe',
            email: req.body.email
          },
          token: 'mock-jwt-token-123'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  });

  app.post('/api/v1/auth/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      res.json({
        success: true,
        data: {
          token: 'new-mock-jwt-token-456'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  });

  // Mock products endpoints
  app.get('/api/v1/products', (req, res) => {
    const mockProducts = [
      {
        id: 1,
        name: 'Base Cabinet 36"',
        category: 'Kitchen Cabinets',
        subcategory: 'Base Cabinets',
        price: 299.99,
        description: 'High-quality base cabinet',
        specifications: {
          width: 36,
          height: 84,
          depth: 24,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        },
        inStock: true,
        featured: true
      },
      {
        id: 2,
        name: 'Wall Cabinet 30"',
        category: 'Kitchen Cabinets',
        subcategory: 'Wall Cabinets',
        price: 199.99,
        description: 'Space-saving wall cabinet',
        specifications: {
          width: 30,
          height: 42,
          depth: 12,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        },
        inStock: true,
        featured: false
      },
      {
        id: 3,
        name: 'Tall Cabinet 18"',
        category: 'Kitchen Cabinets',
        subcategory: 'Tall Cabinets',
        price: 399.99,
        description: 'Maximum storage tall cabinet',
        specifications: {
          width: 18,
          height: 84,
          depth: 24,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        },
        inStock: true,
        featured: true
      }
    ];

    let filteredProducts = [...mockProducts];

    // Apply filters
    if (req.query.category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase().includes((req.query.category as string).toLowerCase())
      );
    }

    if (req.query.subcategory) {
      filteredProducts = filteredProducts.filter(p => 
        p.subcategory.toLowerCase().includes((req.query.subcategory as string).toLowerCase())
      );
    }

    if (req.query.minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(req.query.minPrice as string));
    }

    if (req.query.maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(req.query.maxPrice as string));
    }

    if (req.query.search) {
      const search = (req.query.search as string).toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.description.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    if (req.query.sortBy === 'price') {
      filteredProducts.sort((a, b) => {
        if (req.query.sortOrder === 'desc') {
          return b.price - a.price;
        }
        return a.price - b.price;
      });
    }

    res.json({
      success: true,
      data: {
        products: filteredProducts,
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 10,
          total: filteredProducts.length
        }
      }
    });
  });

  app.get('/api/v1/products/search', (req, res) => {
    if (!req.query.q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    const query = (req.query.q as string).toLowerCase();
    const mockProducts = [
      {
        id: 1,
        name: 'Base Cabinet 36"',
        category: 'Kitchen Cabinets',
        price: 299.99
      },
      {
        id: 2,
        name: 'Wall Cabinet 30"',
        category: 'Kitchen Cabinets',
        price: 199.99
      }
    ];

    const results = mockProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );

    res.json({
      success: true,
      data: {
        products: results,
        query: req.query.q
      }
    });
  });

  app.get('/api/v1/products/categories', (req, res) => {
    res.json({
      success: true,
      data: {
        categories: [
          {
            name: 'Kitchen Cabinets',
            subcategories: ['Base Cabinets', 'Wall Cabinets', 'Tall Cabinets']
          },
          {
            name: 'Bathroom Cabinets',
            subcategories: ['Vanities', 'Medicine Cabinets', 'Linen Cabinets']
          }
        ]
      }
    });
  });

  app.get('/api/v1/products/featured', (req, res) => {
    res.json({
      success: true,
      data: {
        products: [
          {
            id: 1,
            name: 'Base Cabinet 36"',
            price: 299.99,
            featured: true
          },
          {
            id: 3,
            name: 'Tall Cabinet 18"',
            price: 399.99,
            featured: true
          }
        ]
      }
    });
  });

  app.get('/api/v1/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const mockProducts: any = {
      1: {
        id: 1,
        name: 'Base Cabinet 36"',
        category: 'Kitchen Cabinets',
        subcategory: 'Base Cabinets',
        price: 299.99,
        description: 'High-quality base cabinet',
        specifications: {
          width: 36,
          height: 84,
          depth: 24,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        }
      },
      2: {
        id: 2,
        name: 'Wall Cabinet 30"',
        category: 'Kitchen Cabinets',
        subcategory: 'Wall Cabinets',
        price: 199.99,
        description: 'Space-saving wall cabinet',
        specifications: {
          width: 30,
          height: 42,
          depth: 12,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        }
      },
      3: {
        id: 3,
        name: 'Tall Cabinet 18"',
        category: 'Kitchen Cabinets',
        subcategory: 'Tall Cabinets',
        price: 399.99,
        description: 'Maximum storage tall cabinet',
        specifications: {
          width: 18,
          height: 84,
          depth: 24,
          material: 'Solid Wood',
          finish: 'Natural Oak'
        }
      }
    };

    const product = mockProducts[id];
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product
      }
    });
  });

  // Mock quotes endpoints
  const quotes: any[] = [];
  let quoteIdCounter = 1;

  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    next();
  };

  app.post('/api/v1/quotes', requireAuth, (req, res) => {
    const { customerName, customerEmail, projectName, items } = req.body;

    if (!customerName || !customerEmail || !projectName || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate product IDs
    const validProductIds = [1, 2, 3];
    for (const item of items) {
      if (!validProductIds.includes(item.productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID: ${item.productId}`
        });
      }
    }

    const subtotal = items.reduce((sum: number, item: any) => {
      const productPrices: any = { 1: 299.99, 2: 199.99, 3: 399.99 };
      return sum + (productPrices[item.productId] * item.quantity);
    }, 0);

    const taxRate = 0.085;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const quote = {
      id: quoteIdCounter++,
      quoteNumber: `Q-2024-${String(quoteIdCounter - 1).padStart(3, '0')}`,
      customerName,
      customerEmail,
      customerPhone: req.body.customerPhone,
      companyName: req.body.companyName,
      projectName,
      projectDescription: req.body.projectDescription,
      items: items.map((item: any) => ({
        ...item,
        id: Math.random(),
        totalPrice: (item.productId === 1 ? 299.99 : item.productId === 2 ? 199.99 : 399.99) * item.quantity
      })),
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: 'draft',
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    quotes.push(quote);

    res.status(201).json({
      success: true,
      data: {
        quote
      }
    });
  });

  app.get('/api/v1/quotes', requireAuth, (req, res) => {
    let filteredQuotes = [...quotes];

    if (req.query.status) {
      filteredQuotes = filteredQuotes.filter(q => q.status === req.query.status);
    }

    res.json({
      success: true,
      data: {
        quotes: filteredQuotes,
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 10,
          total: filteredQuotes.length
        }
      }
    });
  });

  app.get('/api/v1/quotes/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const quote = quotes.find(q => q.id === id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    res.json({
      success: true,
      data: {
        quote
      }
    });
  });

  app.put('/api/v1/quotes/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    const quote = quotes[quoteIndex];

    if (quote.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify finalized quote'
      });
    }

    // Update quote
    if (req.body.projectName) quote.projectName = req.body.projectName;
    if (req.body.items) {
      quote.items = req.body.items.map((item: any) => ({
        ...item,
        totalPrice: (item.productId === 1 ? 299.99 : item.productId === 2 ? 199.99 : 399.99) * item.quantity
      }));

      // Recalculate totals
      quote.subtotal = quote.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      quote.taxAmount = quote.subtotal * quote.taxRate;
      quote.total = quote.subtotal + quote.taxAmount;
    }

    quotes[quoteIndex] = quote;

    res.json({
      success: true,
      data: {
        quote
      }
    });
  });

  app.patch('/api/v1/quotes/:id/finalize', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    const quote = quotes[quoteIndex];

    if (quote.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Quote is already finalized'
      });
    }

    quote.status = 'finalized';
    quote.finalizedAt = new Date().toISOString();

    quotes[quoteIndex] = quote;

    res.json({
      success: true,
      data: {
        quote
      }
    });
  });

  app.delete('/api/v1/quotes/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    const quote = quotes[quoteIndex];

    if (quote.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete finalized quote'
      });
    }

    quotes.splice(quoteIndex, 1);

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  });

  return app;
};

// Mock quote engine app
export const createMockQuoteEngineApp = (): Express => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());

  app.post('/api/v1/quotes/:id/pdf', (req, res) => {
    const id = parseInt(req.params.id);
    
    // Simulate PDF generation
    const fileName = `quote-Q-2024-${String(id).padStart(3, '0')}-${Date.now()}.pdf`;
    const pdfUrl = `/api/v1/pdfs/${fileName}`;

    res.json({
      success: true,
      data: {
        fileName,
        pdfUrl,
        filePath: `/storage/pdfs/${fileName}`
      }
    });
  });

  app.get('/api/v1/pdfs/:filename', (req, res) => {
    // Simulate PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    
    // Return mock PDF content
    const mockPdfContent = Buffer.from('%PDF-1.4 mock pdf content');
    res.send(mockPdfContent);
  });

  app.post('/api/v1/quotes/:id/email', (req, res) => {
    const { recipientEmail, subject, message } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    res.json({
      success: true,
      message: 'Quote email sent successfully',
      data: {
        recipientEmail,
        subject: subject || 'Your Cabinet Quote',
        sentAt: new Date().toISOString()
      }
    });
  });

  return app;
};

export const setupTestEnvironment = async () => {
  const backendApp = createMockBackendApp();
  const quoteEngineApp = createMockQuoteEngineApp();

  return {
    backendApp,
    quoteEngineApp
  };
};

export const teardownTestEnvironment = async () => {
  // Clean up any resources if needed
  return Promise.resolve();
};