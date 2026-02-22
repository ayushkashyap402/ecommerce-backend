const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  label: {
    type: String,
    default: ''
  },
  // Contact Info
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  alternatePhone: {
    type: String
  },
  // Address Details
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: {
    type: String
  },
  landmark: {
    type: String
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'Invalid pincode (must be 6 digits)'
    }
  },
  country: {
    type: String,
    default: 'India'
  },
  // Location (for future map integration)
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  // Settings
  isDefault: {
    type: Boolean,
    default: false
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

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for better query performance
addressSchema.index({ userId: 1, createdAt: -1 }); // For fetching user's addresses sorted by date
addressSchema.index({ userId: 1, isDefault: 1 }); // For quickly finding default address
addressSchema.index({ userId: 1, type: 1 }); // For filtering by address type

module.exports = mongoose.model('Address', addressSchema);
