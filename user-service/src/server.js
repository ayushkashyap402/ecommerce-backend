require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const profileRoutes = require('./routes/profileRoutes');
const addressRoutes = require('./routes/addressRoutes');

const app = express();

// Security
app.use(helmet());

// Note: CORS is handled by API Gateway

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/profile', profileRoutes);
app.use('/addresses', addressRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[user-service] Error:', err);
  
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// Start server
const port = process.env.PORT || 4008;

const startServer = async () => {
  try {
    await connectDb();
    
    app.listen(port, () => {
      console.log(`[user-service] listening on port ${port}`);
    });
  } catch (error) {
    console.error('[user-service] Failed to start:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
