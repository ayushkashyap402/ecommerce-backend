const express = require('express');
const { createProxy } = require('../middleware/createProxy.production');
const services = require('../config/services.production');

const router = express.Router();

router.use((req, res, next) => {
  console.log('[api-gateway] router hit', req.method, req.originalUrl, 'query:', req.query);
  next();
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
