const wishlistService = require('../services/wishlistService');

// Get user's wishlist
const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const wishlist = await wishlistService.getWishlist(userId);
    res.json(wishlist);
  } catch (err) {
    next(err);
  }
};

// Add product to wishlist
const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const { productId, productName, productPrice, productImage } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    const result = await wishlistService.addToWishlist(userId, {
      productId,
      productName,
      productPrice,
      productImage
    });
    
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    const { productId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const result = await wishlistService.removeFromWishlist(userId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Clear wishlist
const clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const result = await wishlistService.clearWishlist(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Check if product is in wishlist
const checkWishlist = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    const { productId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const isInWishlist = await wishlistService.isInWishlist(userId, productId);
    res.json({ isInWishlist });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkWishlist
};
