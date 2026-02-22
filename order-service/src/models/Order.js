const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    size: {
      type: String
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    // Track which admin's product this is
    productCreatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['cod', 'card', 'upi', 'wallet'],
      default: 'cod'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
      default: function() {
        return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
      }
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    items: [orderItemSchema],
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true
    },
    payment: {
      type: paymentSchema,
      required: true
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      deliveryCharge: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 }
    },
    // Deprecated: kept for backward compatibility, auto-populated from pricing.total
    total: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    estimatedDelivery: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    }
  },
  { timestamps: true }
);

// Generate orderId before saving
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  // Set top-level total from pricing.total for backward compatibility
  if (this.pricing && this.pricing.total) {
    this.total = this.pricing.total;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);

