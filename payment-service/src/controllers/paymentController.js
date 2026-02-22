const razorpayService = require('../services/razorpayService');

/**
 * Create Razorpay Order
 */
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user?.sub || req.body.userId;

    if (!orderId || !amount || !userId) {
      return res.status(400).json({
        message: 'Missing required fields: orderId, amount, userId'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        message: 'Invalid amount'
      });
    }

    const result = await razorpayService.createOrder(orderId, userId, amount);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and Capture Payment
 */
const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        message: 'Missing required payment details'
      });
    }

    const result = await razorpayService.capturePayment(
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Razorpay Webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({
        message: 'Missing webhook signature'
      });
    }

    await razorpayService.handleWebhook(signature, payload);

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Razorpay from retrying
    res.status(200).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get Payment Details
 */
const getPaymentDetails = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpayService.getPaymentDetails(paymentId);

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Payments
 */
const getUserPayments = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    const { status, method, limit } = req.query;

    const payments = await razorpayService.getUserPayments(userId, {
      status,
      method,
      limit: parseInt(limit) || 50
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate Refund
 */
const initiateRefund = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({
        message: 'Missing required fields: amount, reason'
      });
    }

    const result = await razorpayService.initiateRefund(paymentId, amount, reason);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
  getUserPayments,
  initiateRefund
};
