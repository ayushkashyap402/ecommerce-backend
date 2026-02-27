const reelService = require('../services/reelService');
const cloudinary = require('../config/cloudinary');

// Get real statistics
const getStats = async (req, res, next) => {
  try {
    const stats = await reelService.getRealStatistics();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// Create reel
const createReel = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      mediaType, 
      mediaUrl, 
      products,
      scheduledAt 
    } = req.body;
    
    const reelData = {
      sellerId: req.user.userId,
      sellerName: req.user.username || req.user.email,
      sellerAvatar: req.user.avatar,
      title,
      description,
      mediaType: mediaType || 'image',
      mediaUrl,
      products: products || [],
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt
    };
    
    const reel = await reelService.createReel(reelData);
    res.status(201).json(reel);
  } catch (err) {
    next(err);
  }
};

// Get all reels
const getReels = async (req, res, next) => {
  try {
    const { status, sellerId } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (sellerId) filters.sellerId = sellerId;
    
    const reels = await reelService.getReels(filters);
    res.json(reels);
  } catch (err) {
    next(err);
  }
};

// Get live reels
const getLiveReels = async (req, res, next) => {
  try {
    const reels = await reelService.getLiveReels();
    res.json(reels);
  } catch (err) {
    next(err);
  }
};

// Get reel by ID
const getReelById = async (req, res, next) => {
  try {
    const reel = await reelService.getReelById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Increment view count
    await reelService.incrementView(req.params.id);
    
    res.json(reel);
  } catch (err) {
    next(err);
  }
};

// Update reel
const updateReel = async (req, res, next) => {
  try {
    const reel = await reelService.updateReel(req.params.id, req.body);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    res.json(reel);
  } catch (err) {
    next(err);
  }
};

// Delete reel
const deleteReel = async (req, res, next) => {
  try {
    await reelService.deleteReel(req.params.id);
    res.json({ message: 'Reel deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Start live
const startLive = async (req, res, next) => {
  try {
    const reel = await reelService.startLive(req.params.id);
    res.json(reel);
  } catch (err) {
    next(err);
  }
};

// End live
const endLive = async (req, res, next) => {
  try {
    const reel = await reelService.endLive(req.params.id);
    res.json(reel);
  } catch (err) {
    next(err);
  }
};

// Toggle like
const toggleLike = async (req, res, next) => {
  try {
    const { increment } = req.body;
    await reelService.toggleLike(req.params.id, increment !== false);
    res.json({ message: 'Like updated' });
  } catch (err) {
    next(err);
  }
};

// Add comment
const addComment = async (req, res, next) => {
  try {
    const { message, productId } = req.body;
    
    const commentData = {
      reelId: req.params.id,
      userId: req.user.userId,
      userName: req.user.username || req.user.email,
      userAvatar: req.user.avatar,
      message,
      productId
    };
    
    const comment = await reelService.addComment(commentData);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

// Get comments
const getComments = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const comments = await reelService.getComments(
      req.params.id, 
      parseInt(limit) || 50
    );
    res.json(comments);
  } catch (err) {
    next(err);
  }
};

// Delete comment
const deleteComment = async (req, res, next) => {
  try {
    await reelService.deleteComment(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

// Track product view
const trackProductView = async (req, res, next) => {
  try {
    const { productId } = req.body;
    await reelService.trackProductView(req.params.id, productId);
    res.json({ message: 'Product view tracked' });
  } catch (err) {
    next(err);
  }
};

// Track add to cart
const trackAddToCart = async (req, res, next) => {
  try {
    const { productId } = req.body;
    await reelService.trackAddToCart(req.params.id, productId);
    res.json({ message: 'Add to cart tracked' });
  } catch (err) {
    next(err);
  }
};

// Track purchase
const trackPurchase = async (req, res, next) => {
  try {
    const { amount } = req.body;
    await reelService.trackPurchase(req.params.id, amount);
    res.json({ message: 'Purchase tracked' });
  } catch (err) {
    next(err);
  }
};

// Upload media
const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file && !req.body.mediaData) {
      return res.status(400).json({ message: 'No media provided' });
    }
    
    let uploadResult;
    
    if (req.file) {
      // File upload
      uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'live-reels',
        resource_type: 'auto'
      });
    } else if (req.body.mediaData) {
      // Base64 upload
      uploadResult = await cloudinary.uploader.upload(req.body.mediaData, {
        folder: 'live-reels',
        resource_type: 'auto'
      });
    }
    
    res.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      type: uploadResult.resource_type
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  createReel,
  getReels,
  getLiveReels,
  getReelById,
  updateReel,
  deleteReel,
  startLive,
  endLive,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  trackProductView,
  trackAddToCart,
  trackPurchase,
  uploadMedia
};
