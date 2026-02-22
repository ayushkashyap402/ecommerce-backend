const Cart = require('../models/Cart');

const getOrCreateCart = async userId => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
};

const addItem = async (userId, productId, quantity = 1) => {
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }
  await cart.save();
  return cart;
};

const clearCart = userId => {
  return Cart.findOneAndUpdate(
    { userId },
    { items: [] },
    { new: true }
  );
};

const getStats = async () => {
  const active = await Cart.countDocuments({ 
    items: { $exists: true, $ne: [] } 
  });
  
  return {
    active,
    count: active
  };
};

module.exports = {
  getOrCreateCart,
  addItem,
  clearCart,
  getStats
};

