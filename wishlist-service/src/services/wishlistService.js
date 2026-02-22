const Wishlist = require('../models/Wishlist');

// Get user's wishlist
const getWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ userId });
  
  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, products: [] });
  }
  
  return wishlist;
};

// Add product to wishlist
const addToWishlist = async (userId, productData) => {
  let wishlist = await Wishlist.findOne({ userId });
  
  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, products: [] });
  }
  
  // Check if product already exists
  const existingProduct = wishlist.products.find(
    (item) => item.productId === productData.productId
  );
  
  if (existingProduct) {
    return { message: 'Product already in wishlist', wishlist };
  }
  
  // Add product
  wishlist.products.push({
    productId: productData.productId,
    productName: productData.productName,
    productPrice: productData.productPrice,
    productImage: productData.productImage,
    addedAt: new Date()
  });
  
  await wishlist.save();
  return { message: 'Product added to wishlist', wishlist };
};

// Remove product from wishlist
const removeFromWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ userId });
  
  if (!wishlist) {
    throw new Error('Wishlist not found');
  }
  
  wishlist.products = wishlist.products.filter(
    (item) => item.productId !== productId
  );
  
  await wishlist.save();
  return { message: 'Product removed from wishlist', wishlist };
};

// Clear entire wishlist
const clearWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ userId });
  
  if (!wishlist) {
    throw new Error('Wishlist not found');
  }
  
  wishlist.products = [];
  await wishlist.save();
  
  return { message: 'Wishlist cleared', wishlist };
};

// Check if product is in wishlist
const isInWishlist = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ userId });
  
  if (!wishlist) {
    return false;
  }
  
  return wishlist.products.some((item) => item.productId === productId);
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  isInWishlist
};
