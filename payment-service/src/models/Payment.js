const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      index: true,
      default: function() {
        return 'PAY' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
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
    currency: {
      type: String,
      default: 'INR'
    },
    method: {
      type: String,
      enum: ['razorpay', 'cod', 'wallet'],
      required: true
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    // Razorpay Details
    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String
    },
    // Payment Gateway Response
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    // Refund Details
    refund: {
      refundId: String,
      amount: Number,
      reason: String,
      status: String,
      processedAt: Date
    },
    // Timestamps
    authorizedAt: Date,
    capturedAt: Date,
    failedAt: Date,
    refundedAt: Date,
    // Failure Details
    failureReason: String,
    errorCode: String,
    errorDescription: String
  },
  { 
    timestamps: true 
  }
);

// Indexes for analytics
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ method: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'razorpay.orderId': 1 });
paymentSchema.index({ 'razorpay.paymentId': 1 });

module.exports = mongoose.model('Payment', paymentSchema);
