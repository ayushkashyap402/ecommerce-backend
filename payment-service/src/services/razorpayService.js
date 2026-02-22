const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const axios = require('axios');

class RazorpayService {
  /**
   * Create Razorpay Order
   */
  async createOrder(orderId, userId, amount) {
    try {
      // Create payment record
      const payment = await Payment.create({
        orderId,
        userId,
        amount,
        currency: process.env.CURRENCY || 'INR',
        method: 'razorpay',
        status: 'created'
      });

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: process.env.CURRENCY || 'INR',
        receipt: payment.paymentId,
        notes: {
          orderId,
          userId,
          paymentId: payment.paymentId
        }
      });

      // Update payment with Razorpay order ID
      payment.razorpay.orderId = razorpayOrder.id;
      payment.status = 'pending';
      await payment.save();

      console.log('✅ Razorpay order created:', razorpayOrder.id);

      return {
        paymentId: payment.paymentId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('❌ Razorpay order creation failed:', error);
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Verify Payment Signature
   */
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const text = razorpayOrderId + '|' + razorpayPaymentId;
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      return generated_signature === razorpaySignature;
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Capture Payment
   */
  async capturePayment(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      // Find payment record
      const payment = await Payment.findOne({ 
        orderId,
        'razorpay.orderId': razorpayOrderId 
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Verify signature
      const isValid = this.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        payment.status = 'failed';
        payment.failureReason = 'Invalid signature';
        payment.failedAt = new Date();
        await payment.save();
        throw new Error('Payment signature verification failed');
      }

      // Fetch payment details from Razorpay
      const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

      // Update payment record
      payment.razorpay.paymentId = razorpayPaymentId;
      payment.razorpay.signature = razorpaySignature;
      payment.status = razorpayPayment.status === 'captured' ? 'captured' : 'authorized';
      payment.gatewayResponse = razorpayPayment;
      
      if (razorpayPayment.status === 'captured') {
        payment.capturedAt = new Date();
      } else {
        payment.authorizedAt = new Date();
      }

      await payment.save();

      // Notify Order Service
      await this.notifyOrderService(orderId, payment.paymentId, 'success');

      console.log('✅ Payment captured:', razorpayPaymentId);

      return {
        success: true,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount
      };
    } catch (error) {
      console.error('❌ Payment capture failed:', error);
      
      // Update payment as failed
      if (payment) {
        payment.status = 'failed';
        payment.failureReason = error.message;
        payment.failedAt = new Date();
        await payment.save();

        // Notify Order Service
        await this.notifyOrderService(orderId, payment.paymentId, 'failed');
      }

      throw error;
    }
  }

  /**
   * Handle Webhook
   */
  async handleWebhook(signature, payload) {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(signature, payload);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      console.log('📥 Webhook received:', event.event);

      switch (event.event) {
        case 'payment.authorized':
          await this.handlePaymentAuthorized(event.payload.payment.entity);
          break;

        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;

        case 'refund.created':
          await this.handleRefundCreated(event.payload.refund.entity);
          break;

        default:
          console.log('⚠️  Unhandled webhook event:', event.event);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Webhook handling failed:', error);
      throw error;
    }
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(signature, payload) {
    try {
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      return generated_signature === signature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle Payment Authorized
   */
  async handlePaymentAuthorized(paymentEntity) {
    try {
      const payment = await Payment.findOne({
        'razorpay.orderId': paymentEntity.order_id
      });

      if (payment && payment.status === 'pending') {
        payment.razorpay.paymentId = paymentEntity.id;
        payment.status = 'authorized';
        payment.authorizedAt = new Date();
        payment.gatewayResponse = paymentEntity;
        await payment.save();

        console.log('✅ Payment authorized via webhook:', paymentEntity.id);
      }
    } catch (error) {
      console.error('❌ Handle payment authorized failed:', error);
    }
  }

  /**
   * Handle Payment Captured
   */
  async handlePaymentCaptured(paymentEntity) {
    try {
      const payment = await Payment.findOne({
        'razorpay.orderId': paymentEntity.order_id
      });

      if (payment) {
        payment.razorpay.paymentId = paymentEntity.id;
        payment.status = 'captured';
        payment.capturedAt = new Date();
        payment.gatewayResponse = paymentEntity;
        await payment.save();

        // Notify Order Service
        await this.notifyOrderService(payment.orderId, payment.paymentId, 'success');

        console.log('✅ Payment captured via webhook:', paymentEntity.id);
      }
    } catch (error) {
      console.error('❌ Handle payment captured failed:', error);
    }
  }

  /**
   * Handle Payment Failed
   */
  async handlePaymentFailed(paymentEntity) {
    try {
      const payment = await Payment.findOne({
        'razorpay.orderId': paymentEntity.order_id
      });

      if (payment) {
        payment.razorpay.paymentId = paymentEntity.id;
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.failureReason = paymentEntity.error_description;
        payment.errorCode = paymentEntity.error_code;
        payment.errorDescription = paymentEntity.error_description;
        payment.gatewayResponse = paymentEntity;
        await payment.save();

        // Notify Order Service
        await this.notifyOrderService(payment.orderId, payment.paymentId, 'failed');

        console.log('❌ Payment failed via webhook:', paymentEntity.id);
      }
    } catch (error) {
      console.error('❌ Handle payment failed:', error);
    }
  }

  /**
   * Handle Refund Created
   */
  async handleRefundCreated(refundEntity) {
    try {
      const payment = await Payment.findOne({
        'razorpay.paymentId': refundEntity.payment_id
      });

      if (payment) {
        payment.status = 'refunded';
        payment.refund = {
          refundId: refundEntity.id,
          amount: refundEntity.amount / 100,
          status: refundEntity.status,
          processedAt: new Date()
        };
        payment.refundedAt = new Date();
        await payment.save();

        // Notify Order Service
        await this.notifyOrderService(payment.orderId, payment.paymentId, 'refunded');

        console.log('✅ Refund processed via webhook:', refundEntity.id);
      }
    } catch (error) {
      console.error('❌ Handle refund created failed:', error);
    }
  }

  /**
   * Initiate Refund
   */
  async initiateRefund(paymentId, amount, reason) {
    try {
      const payment = await Payment.findOne({ paymentId });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'captured') {
        throw new Error('Only captured payments can be refunded');
      }

      // Create refund in Razorpay
      const refund = await razorpay.payments.refund(payment.razorpay.paymentId, {
        amount: amount * 100, // Convert to paise
        notes: {
          reason,
          orderId: payment.orderId
        }
      });

      // Update payment record
      payment.status = 'refunded';
      payment.refund = {
        refundId: refund.id,
        amount: amount,
        reason,
        status: refund.status,
        processedAt: new Date()
      };
      payment.refundedAt = new Date();
      await payment.save();

      console.log('✅ Refund initiated:', refund.id);

      return {
        success: true,
        refundId: refund.id,
        amount,
        status: refund.status
      };
    } catch (error) {
      console.error('❌ Refund initiation failed:', error);
      throw error;
    }
  }

  /**
   * Get Payment Details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findOne({ paymentId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      console.error('❌ Get payment details failed:', error);
      throw error;
    }
  }

  /**
   * Get User Payments
   */
  async getUserPayments(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.method) {
        query.method = filters.method;
      }

      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return payments;
    } catch (error) {
      console.error('❌ Get user payments failed:', error);
      throw error;
    }
  }

  /**
   * Notify Order Service
   */
  async notifyOrderService(orderId, paymentId, status) {
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL;
      
      await axios.post(`${orderServiceUrl}/api/orders/payment-callback`, {
        orderId,
        paymentId,
        status
      });

      console.log('✅ Order service notified:', orderId);
    } catch (error) {
      console.error('❌ Failed to notify order service:', error.message);
      // Don't throw error, just log it
    }
  }
}

module.exports = new RazorpayService();
