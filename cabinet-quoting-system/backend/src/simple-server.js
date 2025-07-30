const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic API endpoints to prevent frontend errors
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-api' });
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

// Mock products endpoint
app.get('/api/v1/products', (req, res) => {
  res.json({ 
    success: true, 
    data: [],
    meta: { total: 0, page: 1, limit: 20, pages: 0 }
  });
});

// Catch all for other API routes
app.use('/api/v1/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Backend is being fixed. This is a temporary mock server.' 
  });
});

app.listen(PORT, () => {
  console.log(`Mock backend server running on port ${PORT}`);
});