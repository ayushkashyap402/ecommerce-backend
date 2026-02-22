const express = require('express');
const { createProxy } = require('../middleware/createProxy.production');
const services = require('../config/services.production');
const axios = require('axios');

const router = express.Router();

router.use((req, res, next) => {
  console.log('[api-gateway] router hit', req.method, req.originalUrl, 'query:', req.query);
  next();
});

// Health check routes for all services
router.get('/health/all', async (req, res) => {
  const healthChecks = await Promise.allSettled([
    axios.get(`${services.authServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.productServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.cartServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.orderServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.paymentServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.liveServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.wishlistServiceUrl}/health`, { timeout: 5000 }),
    axios.get(`${services.userServiceUrl}/health`, { timeout: 5000 })
  ]);

  const results = {
    auth: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value.data : { status: 'error', error: healthChecks[0].reason?.message },
    product: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value.data : { status: 'error', error: healthChecks[1].reason?.message },
    cart: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value.data : { status: 'error', error: healthChecks[2].reason?.message },
    order: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value.data : { status: 'error', error: healthChecks[3].reason?.message },
    payment: healthChecks[4].status === 'fulfilled' ? healthChecks[4].value.data : { status: 'error', error: healthChecks[4].reason?.message },
    live: healthChecks[5].status === 'fulfilled' ? healthChecks[5].value.data : { status: 'error', error: healthChecks[5].reason?.message },
    wishlist: healthChecks[6].status === 'fulfilled' ? healthChecks[6].value.data : { status: 'error', error: healthChecks[6].reason?.message },
    user: healthChecks[7].status === 'fulfilled' ? healthChecks[7].value.data : { status: 'error', error: healthChecks[7].reason?.message }
  };

  const allHealthy = Object.values(results).every(r => r.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    services: results,
    timestamp: new Date().toISOString()
  });
});

// Individual service health checks
router.get('/health/auth', async (req, res) => {
  try {
    const response = await axios.get(`${services.authServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'auth-service', error: error.message });
  }
});

router.get('/health/products', async (req, res) => {
  try {
    const response = await axios.get(`${services.productServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'product-service', error: error.message });
  }
});

router.get('/health/cart', async (req, res) => {
  try {
    const response = await axios.get(`${services.cartServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'cart-service', error: error.message });
  }
});

router.get('/health/orders', async (req, res) => {
  try {
    const response = await axios.get(`${services.orderServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'order-service', error: error.message });
  }
});

router.get('/health/payments', async (req, res) => {
  try {
    const response = await axios.get(`${services.paymentServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'payment-service', error: error.message });
  }
});

router.get('/health/live', async (req, res) => {
  try {
    const response = await axios.get(`${services.liveServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'live-service', error: error.message });
  }
});

router.get('/health/wishlist', async (req, res) => {
  try {
    const response = await axios.get(`${services.wishlistServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'wishlist-service', error: error.message });
  }
});

router.get('/health/users', async (req, res) => {
  try {
    const response = await axios.get(`${services.userServiceUrl}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'user-service', error: error.message });
  }
});

// Auth Service Routes — path may be /admin-login (after /auth strip); auth-service expects /auth/admin-login
router.use('/auth', createProxy(services.authServiceUrl, {
  pathRewrite: (path) => {
    const p = (path || '').replace(/%0A/g, '').trim();
    return p.startsWith('/auth') ? p : '/auth' + (p ? p : '');
  },
  timeout: 15000,
  proxyTimeout: 15000
}));

// Product Service Routes
router.use('/products', createProxy(services.productServiceUrl, {
  // Product-specific proxy options
  timeout: 10000,
  proxyTimeout: 10000
}));

// Cart Service Routes
router.use('/cart', createProxy(services.cartServiceUrl, {
  // Cart-specific proxy options
  timeout: 8000,
  proxyTimeout: 8000
}));

// Order Service Routes
router.use('/orders', createProxy(services.orderServiceUrl, {
  // Order-specific proxy options
  timeout: 12000,
  proxyTimeout: 12000
}));

// Returns Service Routes (part of order service)
router.use('/returns', createProxy(services.orderServiceUrl, {
  // Returns-specific proxy options
  timeout: 12000,
  proxyTimeout: 12000
}));

console.log('[api-gateway] Returns route registered at /api/returns');
console.log('[api-gateway] Returns service URL:', services.orderServiceUrl);

// Payment Service Routes
router.use('/payments', createProxy(services.paymentServiceUrl, {
  // Payment-specific proxy options
  timeout: 15000,  // Longer timeout for payment processing
  proxyTimeout: 15000
}));

// Live Service Routes
router.use('/live', createProxy(services.liveServiceUrl, {
  // Live service specific options (SSE)
  timeout: 60000,  // Longer timeout for SSE
  proxyTimeout: 60000,
  // Special handling for Server-Sent Events
  ws: true,  // Enable WebSocket proxy if needed
  onProxyReqWs: (proxyReq, req, socket, options, head) => {
    console.log('Proxying WebSocket connection to live service');
  }
}));

// Wishlist Service Routes
router.use('/wishlist', createProxy(services.wishlistServiceUrl, {
  // Wishlist-specific proxy options
  timeout: 8000,
  proxyTimeout: 8000
}));

// User Service Routes
router.use('/users', createProxy(services.userServiceUrl, {
  // User service specific options
  timeout: 10000,
  proxyTimeout: 10000
}));

console.log('[api-gateway] Wishlist route registered at /api/wishlist');
console.log('[api-gateway] Wishlist service URL:', services.wishlistServiceUrl);
console.log('[api-gateway] User service route registered at /api/users');
console.log('[api-gateway] User service URL:', services.userServiceUrl);
console.log('[api-gateway] Payment service route registered at /api/payments');
console.log('[api-gateway] Payment service URL:', services.paymentServiceUrl);

module.exports = router;
