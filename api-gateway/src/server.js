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
    contentSecurityPolicy: false, // Avoid breaking proxy responses
  })
);

/* ================================
   BODY PARSING
================================ */

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({
  extended: true,
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

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

// Default allowed origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://ecommerce-admin-panel-zbqi.onrender.com',
];

// Get origins from environment variable or use defaults
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins;

console.log('[api-gateway] CORS Configuration:');
console.log('[api-gateway] Allowed Origins:', allowedOrigins);
console.log('[api-gateway] Environment:', process.env.NODE_ENV || 'development');

app.use(
  cors({
    origin: function (origin, callback) {
      // Log the incoming origin for debugging
      if (origin) {
        console.log('[CORS] Request from origin:', origin);
      }

      // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
      if (!origin) {
        console.log('[CORS] Allowing request with no origin (mobile/server)');
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log('[CORS] Origin allowed:', origin);
        return callback(null, true);
      }

      // Check for wildcard
      if (allowedOrigins.includes('*')) {
        console.log('[CORS] Wildcard enabled, allowing all origins');
        return callback(null, true);
      }

      // Origin not allowed
      console.log('[CORS] Origin BLOCKED:', origin);
      console.log('[CORS] Allowed origins are:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600, // Cache preflight requests for 10 minutes
  })
);

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

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`[api-gateway] listening on port ${port}`);
});

module.exports = app;
