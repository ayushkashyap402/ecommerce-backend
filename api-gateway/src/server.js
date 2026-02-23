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

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
  : [];

console.log('[api-gateway] CORS Allowed Origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.log('[CORS] Blocked origin:', origin);

      // ❌ DO NOT throw error
      return callback(null, false);
    },
    credentials: true,
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
