const mongoose = require('mongoose');

const reelCommentSchema = new mongoose.Schema(
  {
    reelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveReel',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userAvatar: String,
    
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    
    // For product inquiries
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Indexes
reelCommentSchema.index({ reelId: 1, createdAt: -1 });
reelCommentSchema.index({ userId: 1 });

module.exports = mongoose.model('ReelComment', reelCommentSchema);
