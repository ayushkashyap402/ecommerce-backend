const Transaction = require('../models/Transaction');
const PaymentMethod = require('../models/PaymentMethod');
const Order = require('../models/Order');

class PaymentService {
  // Process COD Payment
  async processCODPayment(orderId, userId, amount) {
    try {
      // Create transaction record
      const transaction = await Transaction.create({
        orderId,
        userId,
        amount,
        method: 'cod',
        status: 'pending', // COD is pending until delivery
        gateway: 'none'
      });

      // Update order payment status
      await Order.findOneAndUpdate(
        { orderId },
        {
          'payment.method': 'cod',
          'payment.status': 'pending',
          'payment.transactionId': transaction.transactionId
        }
      );

      return {
        success: true,
        transactionId: transaction.transactionId,
        message: 'Order placed successfully with Cash on Delivery'
      };
    } catch (error) {
      console.error('COD Payment Error:', error);
      throw new Error('Failed to process COD payment');
    }
  }

  // Process Card Payment (Integration with Razorpay/Stripe)
  async processCardPayment(orderId, userId, amount, cardDetails, saveCard = false) {
    try {
      // TODO: Integrate with payment gateway (Razorpay/Stripe)
      // For now, simulate payment
      
      const transaction = await Transaction.create({
        orderId,
        userId,
        amount,
        method: 'card',
        status: 'pending',
        gateway: 'razorpay', // or 'stripe'
        metadata: {
          cardLast4: cardDetails.cardNumber.slice(-4),
          cardType: cardDetails.cardType
        }
      });

      // Save card if requested
      if (saveCard) {
        await this.savePaymentMethod(userId, {
          type: 'card',
          cardNumber: '****' + cardDetails.cardNumber.slice(-4),
          cardHolderName: cardDetails.cardHolderName,
          expiryMonth: cardDetails.expiryMonth,
          expiryYear: cardDetails.expiryYear,
          cardType: cardDetails.cardType,
          isDefault: cardDetails.isDefault || false
        });
      }

      return {
        success: true,
        transactionId: transaction.transactionId,
        requiresAction: false, // Set to true if 3D Secure needed
        message: 'Payment initiated'
      };
    } catch (error) {
      console.error('Card Payment Error:', error);
      throw new Error('Failed to process card payment');
    }
  }

  // Process UPI Payment
  async processUPIPayment(orderId, userId, amount, upiId, saveUPI = false) {
    try {
      const transaction = await Transaction.create({
        orderId,
        userId,
        amount,
        method: 'upi',
        status: 'pending',
        gateway: 'razorpay',
        metadata: {
          upiId
        }
      });

      // Save UPI if requested
      if (saveUPI) {
        await this.savePaymentMethod(userId, {
          type: 'upi',
          upiId,
          isDefault: false
        });
      }

      return {
        success: true,
        transactionId: transaction.transactionId,
        message: 'UPI payment initiated'
      };
    } catch (error) {
      console.error('UPI Payment Error:', error);
      throw new Error('Failed to process UPI payment');
    }
  }

  // Confirm Payment (Called by payment gateway webhook)
  async confirmPayment(transactionId, gatewayTransactionId, gatewayResponse) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { transactionId },
        {
          status: 'success',
          gatewayTransactionId,
          gatewayResponse,
          completedAt: new Date()
        },
        { new: true }
      );

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update order payment status
      await Order.findOneAndUpdate(
        { orderId: transaction.orderId },
        {
          'payment.status': 'completed',
          'payment.paidAt': new Date(),
          'payment.transactionId': transactionId
        }
      );

      return transaction;
    } catch (error) {
      console.error('Confirm Payment Error:', error);
      throw error;
    }
  }

  // Fail Payment
  async failPayment(transactionId, reason) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { transactionId },
        {
          status: 'failed',
          failureReason: reason,
          failedAt: new Date()
        },
        { new: true }
      );

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update order payment status
      await Order.findOneAndUpdate(
        { orderId: transaction.orderId },
        {
          'payment.status': 'failed'
        }
      );

      return transaction;
    } catch (error) {
      console.error('Fail Payment Error:', error);
      throw error;
    }
  }

  // Save Payment Method
  async savePaymentMethod(userId, paymentMethodData) {
    try {
      const paymentMethod = await PaymentMethod.create({
        userId,
        ...paymentMethodData,
        lastUsed: new Date()
      });

      return paymentMethod;
    } catch (error) {
      console.error('Save Payment Method Error:', error);
      throw new Error('Failed to save payment method');
    }
  }

  // Get User Payment Methods
  async getUserPaymentMethods(userId) {
    try {
      const paymentMethods = await PaymentMethod.find({
        userId,
        isActive: true
      }).sort({ isDefault: -1, lastUsed: -1 });

      return paymentMethods;
    } catch (error) {
      console.error('Get Payment Methods Error:', error);
      throw error;
    }
  }

  // Delete Payment Method
  async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const result = await PaymentMethod.findOneAndUpdate(
        { _id: paymentMethodId, userId },
        { isActive: false }
      );

      return result;
    } catch (error) {
      console.error('Delete Payment Method Error:', error);
      throw error;
    }
  }

  // Get Transaction Details
  async getTransaction(transactionId) {
    try {
      const transaction = await Transaction.findOne({ transactionId });
      return transaction;
    } catch (error) {
      console.error('Get Transaction Error:', error);
      throw error;
    }
  }

  // Get User Transactions
  async getUserTransactions(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.method) {
        query.method = filters.method;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return transactions;
    } catch (error) {
      console.error('Get User Transactions Error:', error);
      throw error;
    }
  }

  // Refund Payment
  async refundPayment(transactionId, refundAmount, reason) {
    try {
      const transaction = await Transaction.findOne({ transactionId });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'success') {
        throw new Error('Can only refund successful transactions');
      }

      // TODO: Process refund with payment gateway

      transaction.status = 'refunded';
      transaction.refundAmount = refundAmount;
      transaction.refundReason = reason;
      transaction.refundedAt = new Date();
      await transaction.save();

      // Update order payment status
      await Order.findOneAndUpdate(
        { orderId: transaction.orderId },
        {
          'payment.status': 'refunded'
        }
      );

      return transaction;
    } catch (error) {
      console.error('Refund Payment Error:', error);
      throw error;
    }
  }

  // Get Payment Analytics
  async getPaymentAnalytics(filters = {}) {
    try {
      const matchStage = {};

      if (filters.startDate && filters.endDate) {
        matchStage.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      const analytics = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$method',
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            }
          }
        }
      ]);

      return analytics;
    } catch (error) {
      console.error('Get Payment Analytics Error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
