const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    products: [
      {
        productId: {
          type: String,
          required: true
        },
        productName: String,
        productPrice: Number,
        productImage: String,
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
