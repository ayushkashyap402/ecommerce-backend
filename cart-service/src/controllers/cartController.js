const cartService = require('../services/cartService');
const axios = require('axios');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002';

// Helper function to fetch product details
const fetchProductDetails = async (productId) => {
  try {
    // Product service internal URL doesn't need /api prefix
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch product ${productId}:`, error.message);
    return null;
  }
};

// Helper function to populate cart items with product details
const populateCartItems = async (items) => {
  const populatedItems = await Promise.all(
    items.map(async (item) => {
      const product = await fetchProductDetails(item.productId);
      if (product) {
        return {
          product,
          quantity: item.quantity
        };
      }
      return null;
    })
  );
  
  // Filter out null values (products that couldn't be fetched)
  return populatedItems.filter(item => item !== null);
};

const getCart = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const cart = await cartService.getOrCreateCart(userId);
    
    // Populate cart items with product details
    const populatedItems = await populateCartItems(cart.items);
    
    // Return in the format frontend expects
    res.json({ 
      items: populatedItems
    });
  } catch (err) {
    next(err);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    const cart = await cartService.addItem(userId, productId, quantity);
    
    // Populate cart items with product details
    const populatedItems = await populateCartItems(cart.items);
    
    // Return in the format frontend expects
    res.json({ 
      cart: {
        items: populatedItems
      }
    });
  } catch (err) {
    next(err);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const cart = await cartService.clearCart(userId);
    
    // Return empty items array
    res.json({ 
      cart: {
        items: []
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    const cart = await cartService.getOrCreateCart(userId);
    
    const item = cart.items.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
      await cart.save();
    }
    
    // Populate cart items with product details
    const populatedItems = await populateCartItems(cart.items);
    
    res.json({ 
      cart: {
        items: populatedItems
      }
    });
  } catch (err) {
    next(err);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { userId } = req.query;
    
    const cart = await cartService.getOrCreateCart(userId);
    cart.items = cart.items.filter(i => i.productId !== productId);
    await cart.save();
    
    // Populate cart items with product details
    const populatedItems = await populateCartItems(cart.items);
    
    res.json({ 
      cart: {
        items: populatedItems
      }
    });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await cartService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getStats
};

