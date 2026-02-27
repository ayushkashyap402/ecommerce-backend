const LiveReel = require('../models/LiveReel');
const ReelComment = require('../models/ReelComment');
const axios = require('axios');

// Get real statistics from other services
const getRealStatistics = async () => {
  try {
    const stats = {
      activeUsers: 0,
      totalOrders: 0,
      totalProducts: 0,
      liveRevenue: 0,
      currentOrders: 0
    };

    // Get real data from services
    const [ordersRes, productsRes] = await Promise.allSettled([
      axios.get(`${process.env.ORDER_SERVICE_URL || 'http://order-service:4004'}/stats`).catch(() => null),
      axios.get(`${process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002'}/stats`).catch(() => null)
    ]);

    // Orders data
    if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
      const orderData = ordersRes.value.data;
      stats.totalOrders = orderData.totalOrders || 0;
      stats.liveRevenue = orderData.totalRevenue || 0;
      stats.currentOrders = orderData.todayOrders || 0;
    }

    // Products data
    if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
      const productData = productsRes.value.data;
      stats.totalProducts = productData.totalProducts || 0;
    }

    // Active users from WebSocket connections
    const socketHandler = require('../websocket/socketHandler');
    stats.activeUsers = socketHandler.getClientCount();

    return stats;
  } catch (error) {
    console.error('Error fetching real statistics:', error.message);
    return {
      activeUsers: 0,
      totalOrders: 0,
      totalProducts: 0,
      liveRevenue: 0,
      currentOrders: 0
    };
  }
};

// Reel CRUD operations
const createReel = async (reelData) => {
  const reel = await LiveReel.create(reelData);
  return reel;
};

const getReels = async (filters = {}) => {
  const query = { ...filters };
  
  // Only show non-draft reels to users
  if (!filters.includeDraft) {
    query.status = { $ne: 'draft' };
  }
  
  const reels = await LiveReel.find(query)
    .sort({ isLive: -1, createdAt: -1 })
    .limit(50);
  
  return reels;
};

const getLiveReels = async () => {
  const reels = await LiveReel.find({ 
    isLive: true, 
    status: 'live' 
  })
    .sort({ currentViewers: -1, createdAt: -1 })
    .limit(20);
  
  return reels;
};

const getReelById = async (reelId) => {
  const reel = await LiveReel.findById(reelId);
  return reel;
};

const updateReel = async (reelId, updates) => {
  const reel = await LiveReel.findByIdAndUpdate(
    reelId,
    { $set: updates },
    { new: true, runValidators: true }
  );
  return reel;
};

const deleteReel = async (reelId) => {
  await LiveReel.findByIdAndDelete(reelId);
};

// Start/Stop live
const startLive = async (reelId) => {
  const reel = await LiveReel.findByIdAndUpdate(
    reelId,
    {
      $set: {
        isLive: true,
        status: 'live',
        startedAt: new Date()
      }
    },
    { new: true }
  );
  
  // Broadcast to all connected clients
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_live_started',
    data: reel
  });
  
  return reel;
};

const endLive = async (reelId) => {
  const reel = await LiveReel.findByIdAndUpdate(
    reelId,
    {
      $set: {
        isLive: false,
        status: 'ended',
        endedAt: new Date()
      }
    },
    { new: true }
  );
  
  // Broadcast to all connected clients
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_live_ended',
    data: { reelId }
  });
  
  return reel;
};

// Increment view count
const incrementView = async (reelId) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $inc: { viewCount: 1 }
  });
};

// Update current viewers
const updateViewers = async (reelId, count) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $set: { currentViewers: count }
  });
};

// Like/Unlike
const toggleLike = async (reelId, increment = true) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $inc: { likeCount: increment ? 1 : -1 }
  });
};

// Comments
const addComment = async (commentData) => {
  const comment = await ReelComment.create(commentData);
  
  // Increment comment count
  await LiveReel.findByIdAndUpdate(commentData.reelId, {
    $inc: { commentCount: 1 }
  });
  
  // Broadcast comment to all viewers
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_comment',
    data: comment
  });
  
  return comment;
};

const getComments = async (reelId, limit = 50) => {
  const comments = await ReelComment.find({
    reelId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit);
  
  return comments;
};

const deleteComment = async (commentId) => {
  await ReelComment.findByIdAndUpdate(commentId, {
    $set: { isDeleted: true }
  });
};

// Shopping actions
const trackProductView = async (reelId, productId) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $inc: { productViews: 1 }
  });
  
  // Broadcast product view
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_product_view',
    data: { reelId, productId }
  });
};

const trackAddToCart = async (reelId, productId) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $inc: { addToCartCount: 1 }
  });
  
  // Broadcast add to cart
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_add_to_cart',
    data: { reelId, productId }
  });
};

const trackPurchase = async (reelId, amount) => {
  await LiveReel.findByIdAndUpdate(reelId, {
    $inc: { 
      purchaseCount: 1,
      revenue: amount
    }
  });
  
  // Broadcast purchase
  const socketHandler = require('../websocket/socketHandler');
  socketHandler.broadcast({
    type: 'reel_purchase',
    data: { reelId, amount }
  });
};

module.exports = {
  getRealStatistics,
  createReel,
  getReels,
  getLiveReels,
  getReelById,
  updateReel,
  deleteReel,
  startLive,
  endLive,
  incrementView,
  updateViewers,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  trackProductView,
  trackAddToCart,
  trackPurchase
};
