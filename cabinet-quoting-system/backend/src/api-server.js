const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'database',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'cabinet_quoting_dev',
  user: process.env.DATABASE_USER || 'cabinet_user',
  password: process.env.DATABASE_PASSWORD || 'cabinet_dev_password'
};

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-api' });
});

// Get unique products with price ranges (grouped by product)
app.get('/api/v1/products', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const actualOffset = offset || (page - 1) * limit;
    
    // Get unique products with price ranges
    const query = `
      WITH product_prices AS (
        SELECT 
          p.id,
          p.item_code,
          p.name,
          p.description,
          p.width_inches,
          p.height_inches,
          p.depth_inches,
          p.door_count,
          p.drawer_count,
          p.is_left_right,
          ct.name as type_name,
          cc.name as category_name,
          MIN(pp.price) as min_price,
          MAX(pp.price) as max_price,
          COUNT(DISTINCT pv.id) as variant_count,
          p.created_at,
          p.updated_at
        FROM cabinet_system.products p
        JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
        JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
        JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
        JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
        GROUP BY p.id, p.item_code, p.name, p.description, p.width_inches, 
                 p.height_inches, p.depth_inches, p.door_count, p.drawer_count,
                 p.is_left_right, ct.name, cc.name, p.created_at, p.updated_at
      )
      SELECT 
        id::text,
        item_code,
        name,
        description,
        width_inches::float as width,
        height_inches::float as height,
        depth_inches::float as depth,
        door_count,
        drawer_count,
        is_left_right,
        type_name,
        category_name,
        min_price::float as min_price,
        max_price::float as max_price,
        variant_count,
        created_at,
        updated_at
      FROM product_prices
      ORDER BY item_code
      LIMIT $1 OFFSET $2
    `;
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM cabinet_system.products p
      JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
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
      error: 'Failed to fetch products',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get consolidated cabinet types (grouped by base_cabinet_type from migration)
app.get('/api/v1/products/consolidated', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    
    const query = `
      WITH cabinet_base_info AS (
        SELECT 
          p.base_cabinet_type,
          MAX(p.display_name) as display_name,
          MAX(p.description) as description,
          MAX(ct.name) as type_name,
          MAX(cc.name) as category_name,
          MAX(p.door_count) as door_count,
          MAX(p.drawer_count) as drawer_count,
          bool_or(p.is_left_right) as is_left_right,
          MIN(pp.price) as min_price,
          MAX(pp.price) as max_price,
          COUNT(DISTINCT pv.id) as total_variants,
          MAX(p.created_at) as created_at,
          MAX(p.updated_at) as updated_at
        FROM cabinet_system.products p
        JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
        JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
        JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
        JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
        WHERE p.base_cabinet_type IS NOT NULL
        GROUP BY p.base_cabinet_type
      ),
      cabinet_sizes AS (
        SELECT 
          sizes.base_cabinet_type,
          json_agg(
            jsonb_build_object(
              'width', sizes.width,
              'height', sizes.height,
              'depth', sizes.depth,
              'product_count', sizes.product_count,
              'price_range', jsonb_build_object(
                'min', sizes.min_price,
                'max', sizes.max_price
              )
            ) ORDER BY sizes.width, sizes.height, sizes.depth
          ) as available_sizes
        FROM (
          SELECT 
            p.base_cabinet_type,
            p.width_inches::float as width,
            p.height_inches::float as height,
            p.depth_inches::float as depth,
            COUNT(DISTINCT p.id) as product_count,
            MIN(pp.price) as min_price,
            MAX(pp.price) as max_price
          FROM cabinet_system.products p
          JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
          JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
          WHERE p.base_cabinet_type IS NOT NULL
          GROUP BY p.base_cabinet_type, p.width_inches, p.height_inches, p.depth_inches
        ) sizes
        GROUP BY sizes.base_cabinet_type
      )
      SELECT 
        cbi.*,
        cs.available_sizes
      FROM cabinet_base_info cbi
      LEFT JOIN cabinet_sizes cs ON cbi.base_cabinet_type = cs.base_cabinet_type
      ORDER BY cbi.base_cabinet_type
      LIMIT $1 OFFSET $2
    `;
    
    const result = await client.query(query, [limit, offset]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consolidated catalog',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get specific consolidated cabinet type details
app.get('/api/v1/products/consolidated/:baseCabinetType', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const baseCabinetType = req.params.baseCabinetType;
    
    const query = `
      WITH cabinet_details AS (
        SELECT 
          p.base_cabinet_type,
          p.display_name,
          p.description,
          ct.name as type_name,
          cc.name as category_name,
          p.door_count,
          p.drawer_count,
          p.is_left_right,
          MIN(pp.price) as min_price,
          MAX(pp.price) as max_price,
          COUNT(DISTINCT pv.id) as total_variants,
          p.created_at,
          p.updated_at
        FROM cabinet_system.products p
        JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
        JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
        JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
        JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
        WHERE p.base_cabinet_type = $1
        GROUP BY p.base_cabinet_type, p.display_name, p.description, ct.name, cc.name, 
                 p.door_count, p.drawer_count, p.is_left_right, p.created_at, p.updated_at
      ),
      cabinet_sizes AS (
        SELECT 
          json_agg(
            jsonb_build_object(
              'width', width,
              'height', height,
              'depth', depth,
              'product_count', product_count,
              'price_range', jsonb_build_object(
                'min', min_price,
                'max', max_price
              )
            ) ORDER BY width, height, depth
          ) as available_sizes
        FROM (
          SELECT 
            p.width_inches::float as width,
            p.height_inches::float as height,
            p.depth_inches::float as depth,
            COUNT(DISTINCT p.id) as product_count,
            MIN(pp.price) as min_price,
            MAX(pp.price) as max_price
          FROM cabinet_system.products p
          JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
          JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
          WHERE p.base_cabinet_type = $1
          GROUP BY p.width_inches, p.height_inches, p.depth_inches
        ) sizes
      )
      SELECT 
        cd.*,
        cs.available_sizes
      FROM cabinet_details cd
      CROSS JOIN cabinet_sizes cs
    `;
    
    const result = await client.query(query, [baseCabinetType]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cabinet type not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cabinet type details',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get available sizes for a consolidated cabinet type
app.get('/api/v1/products/consolidated/:baseCabinetType/sizes', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const baseCabinetType = req.params.baseCabinetType;
    
    const query = `
      SELECT 
        p.width_inches::float as width,
        p.height_inches::float as height,
        p.depth_inches::float as depth,
        COUNT(DISTINCT p.id) as product_count,
        MIN(pp.price) as min_price,
        MAX(pp.price) as max_price
      FROM cabinet_system.products p
      JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
      JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
      WHERE p.base_cabinet_type = $1
      GROUP BY p.width_inches, p.height_inches, p.depth_inches
      ORDER BY p.width_inches, p.height_inches, p.depth_inches
    `;
    
    const result = await client.query(query, [baseCabinetType]);
    
    const sizes = result.rows.map(row => ({
      width: row.width,
      height: row.height,
      depth: row.depth,
      product_count: row.product_count,
      price_range: {
        min: row.min_price,
        max: row.max_price
      }
    }));
    
    res.json({
      success: true,
      data: sizes
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cabinet sizes',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get products for a specific cabinet type and size
app.get('/api/v1/products/consolidated/:baseCabinetType/products/:size', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const baseCabinetType = req.params.baseCabinetType;
    const size = req.params.size; // Format: "24x34.5x24"
    
    // Parse size dimensions
    const [width, height, depth] = size.split('x').map(Number);
    
    const query = `
      SELECT 
        p.id::text,
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
        MIN(pp.price) as min_price,
        MAX(pp.price) as max_price,
        COUNT(DISTINCT pv.id) as variant_count,
        p.created_at,
        p.updated_at
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
      JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
      WHERE p.base_cabinet_type = $1 
        AND p.width_inches = $2 
        AND p.height_inches = $3 
        AND p.depth_inches = $4
      GROUP BY p.id, p.item_code, p.name, p.description, p.width_inches, 
               p.height_inches, p.depth_inches, p.door_count, p.drawer_count,
               p.is_left_right, ct.name, cc.name, p.created_at, p.updated_at
      ORDER BY p.item_code
    `;
    
    const result = await client.query(query, [baseCabinetType, width, height, depth]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products for size',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get product details with all variants and pricing
app.get('/api/v1/products/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const productId = req.params.id;
    
    // Get product details
    const productQuery = `
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
        p.created_at,
        p.updated_at
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      WHERE p.id = $1
    `;
    
    // Get all variants with pricing
    const variantsQuery = `
      SELECT 
        pv.id::text as id,
        pv.sku,
        co.id::text as color_option_id,
        co.name as color_name,
        co.display_name as color_display_name,
        json_agg(
          json_build_object(
            'box_material_id', bm.id::text,
            'box_material_code', bm.code,
            'box_material_name', bm.name,
            'price', pp.price::float
          )
          ORDER BY bm.sort_order
        ) as pricing
      FROM cabinet_system.product_variants pv
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
      JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id
      WHERE pv.product_id = $1
      GROUP BY pv.id, pv.sku, co.id, co.name, co.display_name
      ORDER BY co.sort_order, co.name
    `;
    
    const [productResult, variantsResult] = await Promise.all([
      client.query(productQuery, [productId]),
      client.query(variantsQuery, [productId])
    ]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    const product = productResult.rows[0];
    product.variants = variantsResult.rows;
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product details',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get all color options
app.get('/api/v1/color-options', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        id::text,
        name,
        display_name,
        description
      FROM cabinet_system.color_options
      WHERE is_active = true
      ORDER BY sort_order, name
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch color options',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get all box materials
app.get('/api/v1/box-materials', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        id::text,
        code,
        name,
        description
      FROM cabinet_system.box_materials
      WHERE is_active = true
      ORDER BY sort_order, name
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch box materials',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get product filters (categories, types, etc.)
app.get('/api/v1/products/filters', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Get categories
    const categoriesQuery = `
      SELECT 
        id::text,
        code,
        name,
        description
      FROM cabinet_system.cabinet_categories
      WHERE is_active = true
      ORDER BY sort_order, name
    `;
    
    // Get cabinet types
    const typesQuery = `
      SELECT 
        ct.id::text,
        ct.code,
        ct.name,
        ct.category_id::text,
        cc.name as category_name
      FROM cabinet_system.cabinet_types ct
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      WHERE ct.is_active = true
      ORDER BY cc.sort_order, ct.sort_order, ct.name
    `;
    
    // Get price range
    const priceRangeQuery = `
      SELECT 
        MIN(price)::float as min_price,
        MAX(price)::float as max_price
      FROM cabinet_system.product_pricing
    `;
    
    const [categoriesResult, typesResult, priceRangeResult] = await Promise.all([
      client.query(categoriesQuery),
      client.query(typesQuery),
      client.query(priceRangeQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        categories: categoriesResult.rows,
        cabinet_types: typesResult.rows,
        price_range: priceRangeResult.rows[0],
        color_options: [], // Will be populated by separate endpoint
        box_materials: []  // Will be populated by separate endpoint
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filters',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Search products by item code
app.get('/api/v1/products/search', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const searchTerm = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    
    if (!searchTerm) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const query = `
      SELECT DISTINCT
        p.id::text,
        p.item_code,
        p.name,
        p.description,
        ct.name as type_name,
        cc.name as category_name
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      WHERE 
        p.item_code ILIKE $1 OR
        p.name ILIKE $1 OR
        p.description ILIKE $1
      ORDER BY 
        CASE 
          WHEN p.item_code ILIKE $2 THEN 1
          WHEN p.item_code ILIKE $1 THEN 2
          WHEN p.name ILIKE $2 THEN 3
          WHEN p.name ILIKE $1 THEN 4
          ELSE 5
        END,
        p.item_code
      LIMIT $3
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const exactPattern = searchTerm;
    
    const result = await client.query(query, [searchPattern, exactPattern, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Authentication endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Simple demo authentication
    if (email === 'admin@yukon.com' && password === 'admin123') {
      res.json({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'admin@yukon.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_active: true,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          token: 'demo-admin-token-' + Date.now(),
          refresh_token: 'demo-refresh-token-' + Date.now(),
          expires_in: 3600
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

app.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token && token.startsWith('demo-admin-token-')) {
    res.json({
      success: true,
      data: {
        id: '1',
        email: 'admin@yukon.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing token'
    });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;
  
  if (refresh_token && refresh_token.startsWith('demo-refresh-token-')) {
    res.json({
      success: true,
      data: {
        token: 'demo-admin-token-' + Date.now(),
        refresh_token: 'demo-refresh-token-' + Date.now(),
        expires_in: 3600
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

// Export products as CSV
app.get('/api/v1/admin/export/products', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        p.id,
        p.item_code,
        p.name,
        p.description,
        p.width_inches as width,
        p.height_inches as height,
        p.depth_inches as depth,
        p.door_count,
        p.drawer_count,
        p.is_left_right,
        ct.name as cabinet_type,
        cc.name as category,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM cabinet_system.products p
      JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
      JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
      ORDER BY p.item_code
    `;
    
    const result = await client.query(query);
    
    // Generate CSV content
    const headers = [
      'ID', 'Item Code', 'Name', 'Description', 'Width', 'Height', 'Depth',
      'Door Count', 'Drawer Count', 'Left/Right', 'Cabinet Type', 'Category',
      'Active', 'Created At', 'Updated At'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    result.rows.forEach(row => {
      const csvRow = [
        `"${row.id}"`,
        `"${row.item_code}"`,
        `"${row.name.replace(/"/g, '""')}"`,
        `"${(row.description || '').replace(/"/g, '""')}"`,
        row.width,
        row.height,
        row.depth,
        row.door_count,
        row.drawer_count,
        row.is_left_right,
        `"${row.cabinet_type}"`,
        `"${row.category}"`,
        row.is_active,
        `"${row.created_at}"`,
        `"${row.updated_at}"`
      ];
      csvContent += csvRow.join(',') + '\n';
    });
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export products',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Color Options Management
app.get('/api/v1/admin/color-options', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        id::text,
        name,
        display_name,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM cabinet_system.color_options
      ORDER BY sort_order, name
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Color options error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch color options',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.post('/api/v1/admin/color-options', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { name, display_name, description, is_active = true, sort_order = 0 } = req.body;
    
    const query = `
      INSERT INTO cabinet_system.color_options (name, display_name, description, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id::text, name, display_name, description, is_active, sort_order, created_at, updated_at
    `;
    
    const result = await client.query(query, [name, display_name, description, is_active, sort_order]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create color option error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create color option',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.put('/api/v1/admin/color-options/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    const { name, display_name, description, is_active, sort_order } = req.body;
    
    const query = `
      UPDATE cabinet_system.color_options 
      SET name = $1, display_name = $2, description = $3, is_active = $4, sort_order = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id::text, name, display_name, description, is_active, sort_order, created_at, updated_at
    `;
    
    const result = await client.query(query, [name, display_name, description, is_active, sort_order, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Color option not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update color option error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update color option',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.delete('/api/v1/admin/color-options/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    
    const query = `DELETE FROM cabinet_system.color_options WHERE id = $1`;
    const result = await client.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Color option not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Color option deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete color option error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete color option',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Box Materials Management
app.get('/api/v1/admin/box-materials', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        id::text,
        code,
        name,
        description,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM cabinet_system.box_materials
      ORDER BY sort_order, name
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Box materials error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch box materials',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.post('/api/v1/admin/box-materials', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { code, name, description, is_active = true, sort_order = 0 } = req.body;
    
    const query = `
      INSERT INTO cabinet_system.box_materials (code, name, description, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id::text, code, name, description, is_active, sort_order, created_at, updated_at
    `;
    
    const result = await client.query(query, [code, name, description, is_active, sort_order]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create box material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create box material',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.put('/api/v1/admin/box-materials/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    const { code, name, description, is_active, sort_order } = req.body;
    
    const query = `
      UPDATE cabinet_system.box_materials 
      SET code = $1, name = $2, description = $3, is_active = $4, sort_order = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id::text, code, name, description, is_active, sort_order, created_at, updated_at
    `;
    
    const result = await client.query(query, [code, name, description, is_active, sort_order, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Box material not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update box material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update box material',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

app.delete('/api/v1/admin/box-materials/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    
    const query = `DELETE FROM cabinet_system.box_materials WHERE id = $1`;
    const result = await client.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Box material not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Box material deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete box material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete box material',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// ========================================
// PRICING MANAGEMENT ENDPOINTS
// ========================================

// Get all pricing with product and material details
app.get('/api/v1/admin/pricing', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        pp.id::text as id,
        pp.price::float as price,
        pp.effective_date,
        pp.expiration_date,
        pp.created_at,
        pp.updated_at,
        pv.id::text as product_variant_id,
        pv.sku,
        p.item_code,
        p.name as product_name,
        p.width_inches,
        p.height_inches,
        p.depth_inches,
        co.name as color_option,
        co.display_name as color_display_name,
        bm.code as material_code,
        bm.name as material_name
      FROM cabinet_system.product_pricing pp
      JOIN cabinet_system.product_variants pv ON pp.product_variant_id = pv.id
      JOIN cabinet_system.products p ON pv.product_id = p.id
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id
    `;
    
    const params = [];
    if (search) {
      query += ` WHERE (p.item_code ILIKE $1 OR p.name ILIKE $1 OR co.display_name ILIKE $1 OR bm.name ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY p.item_code, co.sort_order, bm.sort_order LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cabinet_system.product_pricing pp
      JOIN cabinet_system.product_variants pv ON pp.product_variant_id = pv.id
      JOIN cabinet_system.products p ON pv.product_id = p.id
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id
    `;
    
    const countParams = [];
    if (search) {
      countQuery += ` WHERE (p.item_code ILIKE $1 OR p.name ILIKE $1 OR co.display_name ILIKE $1 OR bm.name ILIKE $1)`;
      countParams.push(`%${search}%`);
    }
    
    const [result, countResult] = await Promise.all([
      client.query(query, params),
      client.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const pages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: result.rows,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages
      }
    });
    
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get pricing for a specific product variant
app.get('/api/v1/admin/pricing/variant/:variantId', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { variantId } = req.params;
    
    const query = `
      SELECT 
        pp.id::text as id,
        pp.price::float as price,
        pp.effective_date,
        pp.expiration_date,
        pp.created_at,
        pp.updated_at,
        bm.id as box_material_id,
        bm.code as material_code,
        bm.name as material_name
      FROM cabinet_system.product_pricing pp
      JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id
      WHERE pp.product_variant_id = $1
      ORDER BY bm.sort_order
    `;
    
    const result = await client.query(query, [variantId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get variant pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variant pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Create new pricing
app.post('/api/v1/admin/pricing', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { product_variant_id, box_material_id, price, effective_date, expiration_date } = req.body;
    
    const query = `
      INSERT INTO cabinet_system.product_pricing 
      (product_variant_id, box_material_id, price, effective_date, expiration_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id::text, price::float, effective_date, expiration_date, created_at, updated_at
    `;
    
    const result = await client.query(query, [
      product_variant_id, 
      box_material_id, 
      price, 
      effective_date || new Date(), 
      expiration_date || null
    ]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Create pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Update pricing
app.put('/api/v1/admin/pricing/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    const { price, effective_date, expiration_date } = req.body;
    
    const query = `
      UPDATE cabinet_system.product_pricing 
      SET price = $1, effective_date = $2, expiration_date = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id::text, price::float, effective_date, expiration_date, created_at, updated_at
    `;
    
    const result = await client.query(query, [price, effective_date, expiration_date, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pricing record not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Delete pricing
app.delete('/api/v1/admin/pricing/:id', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { id } = req.params;
    
    const query = `DELETE FROM cabinet_system.product_pricing WHERE id = $1`;
    const result = await client.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pricing record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Pricing deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Bulk update pricing (useful for price changes across materials)
app.post('/api/v1/admin/pricing/bulk-update', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const { updates } = req.body; // Array of { id, price, effective_date, expiration_date }
    
    await client.query('BEGIN');
    
    const results = [];
    for (const update of updates) {
      const query = `
        UPDATE cabinet_system.product_pricing 
        SET price = $1, effective_date = $2, expiration_date = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id::text, price::float, effective_date, expiration_date
      `;
      
      const result = await client.query(query, [
        update.price, 
        update.effective_date, 
        update.expiration_date, 
        update.id
      ]);
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: results,
      message: `Updated ${results.length} pricing records`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update pricing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update pricing',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Get product variants for pricing setup
app.get('/api/v1/admin/product-variants', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        pv.id::text as id,
        pv.sku,
        p.item_code,
        p.name as product_name,
        p.width_inches,
        p.height_inches,
        p.depth_inches,
        co.name as color_option,
        co.display_name as color_display_name
      FROM cabinet_system.product_variants pv
      JOIN cabinet_system.products p ON pv.product_id = p.id
      JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
      WHERE pv.is_active = true AND p.is_active = true
      ORDER BY p.item_code, co.sort_order
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get product variants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product variants',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Cabinet Quoting API running on port ${PORT}`);
});
