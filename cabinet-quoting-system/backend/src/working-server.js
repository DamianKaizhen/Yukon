const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.API_PORT || 3002;

// Database connection
const dbConfig = {
  host: 'database',
  port: 5432,
  database: 'cabinet_quoting_dev',
  user: 'cabinet_user',
  password: 'cabinet_dev_password'  
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-api' });
});

// Products endpoint with database connection
app.get('/api/v1/products', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit) || 50, 500); // Max 500
    const offset = parseInt(req.query.offset) || 0;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const actualOffset = offset || (page - 1) * limit;
    
    const query = `
      SELECT 
        p.id::text as id, 
        p.item_code, 
        p.name, 
        p.description,
        p.width_inches::float as width, 
        p.height_inches::float as height, 
        p.depth_inches::float as depth,
        p.door_count,
        p.drawer_count,
        p.is_left_right,
        ct.name as type_name,
        cc.name as category_name,
        co.display_name as color,
        pp.price::float as price,
        pv.id::text as variant_id,
        pv.sku,
        co.id::text as color_option_id,
        p.created_at,
        p.updated_at
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
      ORDER BY p.item_code
      LIMIT $1 OFFSET $2
    `;
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
    `;
    
    const [result, countResult] = await Promise.all([
      client.query(query, [limit, actualOffset]),
      client.query(countQuery)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const pages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: total,
        page: page,
        limit: limit,
        pages: pages,
        offset: actualOffset
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// Categories endpoint
app.get('/api/v1/products/categories', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT cc.id, cc.code, cc.name, cc.description,
             COUNT(p.id) as product_count
      FROM cabinet_system.cabinet_categories cc
      LEFT JOIN cabinet_system.cabinet_types ct ON cc.id = ct.category_id
      LEFT JOIN cabinet_system.products p ON ct.id = p.cabinet_type_id
      WHERE cc.is_active = true
      GROUP BY cc.id, cc.code, cc.name, cc.description
      ORDER BY cc.sort_order
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// Mock auth endpoints
app.post('/api/v1/auth/login', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      token: 'mock-jwt-token',
      user: { id: 1, email: 'admin@example.com', role: 'admin' }
    }
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      token: 'mock-jwt-token',
      user: { id: 2, email: req.body.email, role: 'customer' }
    }
  });
});

// Catch all for other API routes
app.use('/api/v1/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not implemented yet' 
  });
});

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
  console.log(`Database connection configured for: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
});