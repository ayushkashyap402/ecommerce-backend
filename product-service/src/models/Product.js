const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      unique: true,
      sparse: true
    },
    brand: {
      type: String,
      default: 'OutfitGo'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    images: {
      type: [String],
      default: []
    },
    imagePublicIds: {
      type: [String],
      default: []
    },
    sizes: {
      type: [String],
      default: []
    },
    thumbnailUrl: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    stock: {
      type: Number,
      default: 0
    },
    // Link each product to the admin who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      refPath: 'createdByModel'
    },
    createdByModel: {
      type: String,
      enum: ['Admin', 'SuperAdmin'],
      default: 'Admin'
    },
    createdByName: {
      type: String,
      default: 'Unknown'
    },
    createdByRole: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin'
    },
    // Reviews
    reviews: [{
      userId: {
        type: String,
        required: true
      },
      userName: {
        type: String,
        required: true
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Function to generate unique SKU code
// Format: CAT-YYYYMMDD-XXXXX (e.g., MEN-20260227-A1B2C)
const generateSKU = (category) => {
  const categoryPrefix = {
    'menswear': 'MEN',
    'womenwear': 'WOM',
    'kidswear': 'KID',
    'winterwear': 'WIN',
    'summerwear': 'SUM',
    'footwear': 'FOT'
  };
  
  const prefix = categoryPrefix[category.toLowerCase()] || 'PRD';
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  // Generate random alphanumeric code (5 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  for (let i = 0; i < 5; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}-${dateStr}-${randomCode}`;
};

// Function to get model for specific category collection
const getProductModel = (category) => {
  // Normalize category name for collection
  const collectionName = category.toLowerCase().replace(/\s+/g, '');
  
  // Check if model already exists
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }
  
  // Create new model with category-specific collection
  return mongoose.model(collectionName, productSchema, collectionName);
};

// Default model for backward compatibility
const Product = mongoose.model('Product', productSchema);

module.exports = {
  Product,
  getProductModel,
  generateSKU
};
