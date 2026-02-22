const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Basic Info (synced from auth-service)
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  // Extended Profile
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^[+]?[\d\s-()]+$/.test(v);
      },
      message: 'Invalid phone number'
    }
  },
  avatar: {
    type: String,
    default: null
  },
  avatarPublicId: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  // Preferences
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  // Stats
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    wishlistCount: {
      type: Number,
      default: 0
    }
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
userProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
