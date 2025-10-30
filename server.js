require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const countriesRouter = require('./routes/countries');
const { errorHandler } = require('./middleware/errorHandler');
const { initDb } = require('./config/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/countries', countriesRouter);


// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Starting server...');
      
      // Initialize DB first
      await initDb();

      // Create cache directory
      const cacheDir = process.env.CACHE_DIR || './cache';
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`📁 Cache directory created at ${cacheDir}`);
      }

      app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (err) {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = app;
