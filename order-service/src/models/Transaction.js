const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      index: true,
      default: function() {
        return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
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
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ['cod', 'card', 'upi', 'wallet'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    // Payment Gateway Details (for online payments)
    gateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'none'],
      default: 'none'
    },
    gatewayTransactionId: {
      type: String
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    // Payment Method Details
    metadata: {
      cardLast4: String,
      cardType: String,
      upiId: String,
      bankName: String
    },
    // Timestamps
    completedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    // Failure/Refund Details
    failureReason: {
      type: String
    },
    refundReason: {
      type: String
    },
    refundAmount: {
      type: Number
    }
  },
  { timestamps: true }
);

// Generate transaction ID before saving
transactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Compound indexes for analytics
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ method: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
