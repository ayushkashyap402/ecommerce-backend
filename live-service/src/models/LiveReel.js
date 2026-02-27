const mongoose = require('mongoose');

const liveReelSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sellerName: {
      type: String,
      required: true
    },
    sellerAvatar: String,
    
    title: {
      type: String,
      required: true
    },
    description: String,
    
    // Media
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    mediaUrl: {
      type: String,
      required: true
    },
    mediaPublicId: String,
    thumbnailUrl: String,
    
    // Tagged Products
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      name: String,
      price: Number,
      image: String,
      rating: Number,
      soldCount: Number,
      originalPrice: Number,
      discount: Number,
      position: {
        x: Number, // Position on screen (percentage)
        y: Number
      }
    }],
    
    // Live Status
    isLive: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ended'],
      default: 'draft'
    },
    
    // Statistics
    viewCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    currentViewers: {
      type: Number,
      default: 0
    },
    
    // Shopping Stats
    productViews: {
      type: Number,
      default: 0
    },
    addToCartCount: {
      type: Number,
      default: 0
    },
    purchaseCount: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    
    // Schedule
    scheduledAt: Date,
    startedAt: Date,
    endedAt: Date,
    
    // Settings
    allowComments: {
      type: Boolean,
      default: true
    },
    allowSharing: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
liveReelSchema.index({ sellerId: 1, status: 1 });
liveReelSchema.index({ isLive: 1, status: 1 });
liveReelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LiveReel', liveReelSchema);
