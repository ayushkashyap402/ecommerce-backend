const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['card', 'upi'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    // Card Details (encrypted in production)
    cardNumber: {
      type: String, // Masked: ****1234
    },
    cardHolderName: {
      type: String
    },
    expiryMonth: {
      type: String
    },
    expiryYear: {
      type: String
    },
    cardType: {
      type: String,
      enum: ['visa', 'mastercard', 'rupay', 'amex']
    },
    // UPI Details
    upiId: {
      type: String
    },
    // Metadata
    lastUsed: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for faster queries
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ userId: 1, type: 1 });

// Ensure only one default payment method per user per type
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        type: this.type,
        _id: { $ne: this._id }
      },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
