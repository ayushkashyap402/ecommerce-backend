require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const routes = require('./routes/index.production');

const app = express();

/* ================================
   SECURITY
================================ */

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

/* ================================
   COMPRESSION
================================ */

app.use(compression());

/* ================================
   RATE LIMITING
================================ */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});

app.use(limiter);

/* ================================
   CORS
================================ */

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
  : [];

console.log('[api-gateway] CORS Allowed Origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.replace(/\/$/, '');

      // Check if origin is allowed
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Origin not allowed
      console.log('[CORS] Blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

/* ================================
   BODY PARSING
================================ */

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use('/api/auth/admin/login', (req, res, next) => {
  const bodyKeys = req.body && typeof req.body === 'object'
    ? Object.keys(req.body)
    : [];
  console.log('[api-gateway] login body info', {
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
    bodyType: typeof req.body,
    bodyKeys,
  });
  next();
});

/* ================================
  LOGGING
================================ */

app.use(
  process.env.NODE_ENV === 'production'
    ? morgan('combined')
    : morgan('dev')
);

/* ================================
   HEALTH CHECK
================================ */

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

/* ================================
  ROUTES
================================ */

app.use('/api', routes);

/* ================================
   404 HANDLER
================================ */

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

/* ================================
   GLOBAL ERROR HANDLER
================================ */

app.use((err, req, res, next) => {
  console.error('Global error:', err);

  res.status(err.statusCode || 500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

/* ================================
   SERVER START
================================ */

const port = process.env.PORT;

const server = app.listen(port, () => {
  console.log(`[api-gateway] listening on port ${port}`);
});

module.exports = { app, server };
