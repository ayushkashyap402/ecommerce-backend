const express = require('express');
const controller = require('../controllers/productController');
const { authenticate, requireAdmin, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required)
router.get('/stream', controller.stream);
router.get('/stats', controller.getStats);
router.get('/low-stock', controller.getLowStock);

// Get single product by ID - BEFORE the catch-all / route
router.get('/:id', controller.getById);

// Add review to product (public - any user can review)
router.post('/:productId/reviews', controller.addReview);

// List all products - catch-all route MUST be last
router.get('/', controller.list); // Auth is optional, handled in controller

// Admin-only routes
router.post('/', authenticate, requireAdmin, authorize('manage_products'), controller.create);
router.put('/:id', authenticate, requireAdmin, authorize('manage_products'), controller.update);
router.delete('/:id', authenticate, requireAdmin, authorize('manage_products'), controller.remove);

module.exports = router;

