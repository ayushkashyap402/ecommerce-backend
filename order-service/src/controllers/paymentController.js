const paymentService = require('../services/paymentService');

// Process Payment
const processPayment = async (req, res, next) => {
  try {
    const { orderId, amount, method, paymentDetails } = req.body;
    const userId = req.user?.sub || req.body.userId;

    if (!userId || !orderId || !amount || !method) {
      return res.status(400).json({ 
        message: 'Missing required fields: userId, orderId, amount, method' 
      });
    }

    let result;

    switch (method) {
      case 'cod':
        result = await paymentService.processCODPayment(orderId, userId, amount);
        break;

      case 'card':
        if (!paymentDetails?.cardDetails) {
          return res.status(400).json({ message: 'Card details required' });
        }
        result = await paymentService.processCardPayment(
          orderId,
          userId,
          amount,
          paymentDetails.cardDetails,
          paymentDetails.saveCard
        );
        break;

      case 'upi':
        if (!paymentDetails?.upiId) {
          return res.status(400).json({ message: 'UPI ID required' });
        }
        result = await paymentService.processUPIPayment(
          orderId,
          userId,
          amount,
          paymentDetails.upiId,
          paymentDetails.saveUPI
        );
        break;

      default:
        return res.status(400).json({ message: 'Invalid payment method' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Confirm Payment (Webhook from payment gateway)
const confirmPayment = async (req, res, next) => {
  try {
    const { transactionId, gatewayTransactionId, gatewayResponse } = req.body;

    const transaction = await paymentService.confirmPayment(
      transactionId,
      gatewayTransactionId,
      gatewayResponse
    );

    res.json({
      success: true,
      transaction
    });
  } catch (err) {
    next(err);
  }
};

// Get Transaction
const getTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await paymentService.getTransaction(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    next(err);
  }
};

// Get User Transactions
const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;
    const { method, status, limit } = req.query;

    const transactions = await paymentService.getUserTransactions(userId, {
      method,
      status,
      limit: parseInt(limit) || 50
    });

    res.json(transactions);
  } catch (err) {
    next(err);
  }
};

// Save Payment Method
const savePaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.body.userId;
    const paymentMethodData = req.body;

    const paymentMethod = await paymentService.savePaymentMethod(
      userId,
      paymentMethodData
    );

    res.json({
      success: true,
      paymentMethod
    });
  } catch (err) {
    next(err);
  }
};

// Get User Payment Methods
const getUserPaymentMethods = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.query.userId;

    const paymentMethods = await paymentService.getUserPaymentMethods(userId);

    res.json(paymentMethods);
  } catch (err) {
    next(err);
  }
};

// Delete Payment Method
const deletePaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.body.userId;
    const { paymentMethodId } = req.params;

    await paymentService.deletePaymentMethod(userId, paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method deleted'
    });
  } catch (err) {
    next(err);
  }
};

// Refund Payment
const refundPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { refundAmount, reason } = req.body;

    const transaction = await paymentService.refundPayment(
      transactionId,
      refundAmount,
      reason
    );

    res.json({
      success: true,
      transaction
    });
  } catch (err) {
    next(err);
  }
};

// Get Payment Analytics
const getPaymentAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await paymentService.getPaymentAnalytics({
      startDate,
      endDate
    });

    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  processPayment,
  confirmPayment,
  getTransaction,
  getUserTransactions,
  savePaymentMethod,
  getUserPaymentMethods,
  deletePaymentMethod,
  refundPayment,
  getPaymentAnalytics
};
