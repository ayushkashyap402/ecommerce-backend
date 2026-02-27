require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const liveRoutes = require('./routes/liveRoutes');
const socketHandler = require('./websocket/socketHandler');
const liveEvents = require('./websocket/events');

const app = express();

app.use(helmet());

// Note: CORS is handled by API Gateway

// Increase body size limit for image uploads (base64 images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'live-service',
    websocket: socketHandler.getClientCount() + ' clients connected'
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json(liveEvents.getStats());
});

// Live events endpoint (for Server-Sent Events)
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial stats
  res.write(`data: ${JSON.stringify({
    type: 'stats',
    data: liveEvents.getStats(),
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send periodic updates
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'stats',
      data: liveEvents.getStats(),
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 5000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

app.use('/', liveRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const port = process.env.PORT || 4006;

connectDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`[live-service] listening on port ${port}`);
      console.log(`[live-service] WebSocket enabled on ws://localhost:${port}/ws`);
    });

    // Initialize WebSocket server
    socketHandler.initialize(server);
    
    console.log('[live-service] WebSocket server initialized');
  })
  .catch(err => {
    console.error('[live-service] failed to connect to db', err);
    process.exit(1);
  });

