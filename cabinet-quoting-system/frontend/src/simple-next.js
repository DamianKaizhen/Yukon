const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frontend' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'frontend-api' });
});

app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cabinet Quoting System</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .status { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏠 Cabinet Quoting System</h1>
        <div class="status">
          <h3>✅ System Status: Running</h3>
          <p>The system is currently being set up and optimized.</p>
        </div>
        <div class="info">
          <h4>Available Services:</h4>
          <ul>
            <li>✅ Database (PostgreSQL) - Running</li>
            <li>✅ Backend API - Running at <a href="http://localhost:3002/health">:3002</a></li>
            <li>⚡ Frontend (This page) - Running at :3000</li>
            <li>🔄 Admin Interface - Starting at :3001</li>
            <li>🔄 Quote Engine - Starting at :3003</li>
          </ul>
        </div>
        <div class="info">
          <h4>Quick Links:</h4>
          <ul>
            <li><a href="http://localhost:3001">Admin Dashboard</a></li>
            <li><a href="http://localhost:3002/health">Backend Health Check</a></li>
            <li><a href="/catalog">Product Catalog (Coming Soon)</a></li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});