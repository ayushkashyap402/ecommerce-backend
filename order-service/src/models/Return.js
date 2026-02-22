const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
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
    returnReason: {
      type: String
    }
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnId: {
      type: String,
      unique: true,
      index: true,
      default: function() {
        return 'RET' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
      }
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    items: [returnItemSchema],
    returnReason: {
      type: String,
      required: true,
      enum: [
        'defective',
        'wrong_item',
        'not_as_described',
        'size_issue',
        'quality',
        'changed_mind',
        'other'
      ]
    },
    returnReasonText: {
      type: String,
      required: true
    },
    additionalComments: {
      type: String
    },
    images: [{
      type: String // URLs of uploaded images showing defect/issue
    }],
    refundMethod: {
      type: String,
      enum: ['original', 'wallet'],
      default: 'original'
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: [
        'requested',      // User submitted return request
        'approved',       // Admin approved the return
        'rejected',       // Admin rejected the return
        'pickup_scheduled', // Pickup scheduled
        'picked_up',      // Item picked up from customer
        'received',       // Item received at warehouse
        'inspected',      // Quality inspection completed
        'refund_initiated', // Refund process started
        'refund_completed', // Refund completed
        'cancelled'       // Return request cancelled
      ],
      default: 'requested',
      index: true
    },
    pickupAddress: {
      name: { type: String },
      phone: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      landmark: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' }
    },
    pickupScheduledDate: {
      type: Date
    },
    pickedUpAt: {
      type: Date
    },
    receivedAt: {
      type: Date
    },
    inspectedAt: {
      type: Date
    },
    inspectionNotes: {
      type: String
    },
    inspectionResult: {
      type: String,
      enum: ['approved', 'rejected', 'partial'],
    },
    refundInitiatedAt: {
      type: Date
    },
    refundCompletedAt: {
      type: Date
    },
    refundTransactionId: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    rejectedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    adminNotes: {
      type: String
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate returnId before saving
returnSchema.pre('save', function(next) {
  if (!this.returnId) {
    this.returnId = 'RET' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Virtual for order reference
returnSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true
});

// Index for efficient queries
returnSchema.index({ userId: 1, createdAt: -1 });
returnSchema.index({ orderId: 1 });
returnSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
