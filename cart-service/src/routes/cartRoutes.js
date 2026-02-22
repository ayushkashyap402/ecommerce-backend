const express = require('express');
const controller = require('../controllers/cartController');

const router = express.Router();

// Stats endpoint
router.get('/stats', controller.getStats);

// Cart operations
router.get('/', controller.getCart);
router.post('/items', controller.addToCart);
router.put('/items', controller.updateCartItem);
router.delete('/items/:productId', controller.removeFromCart);
router.post('/clear', controller.clearCart);

module.exports = router;

