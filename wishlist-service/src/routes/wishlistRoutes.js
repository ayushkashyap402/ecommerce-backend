const express = require('express');
const controller = require('../controllers/wishlistController');

const router = express.Router();

// Get user's wishlist
router.get('/', controller.getWishlist);

// Add product to wishlist
router.post('/items', controller.addToWishlist);

// Remove product from wishlist
router.delete('/items/:productId', controller.removeFromWishlist);

// Clear wishlist
router.post('/clear', controller.clearWishlist);

// Check if product is in wishlist
router.get('/check/:productId', controller.checkWishlist);

module.exports = router;
