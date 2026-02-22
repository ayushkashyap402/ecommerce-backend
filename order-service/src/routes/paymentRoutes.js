const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Process payment
router.post('/process', paymentController.processPayment);

// Confirm payment (webhook)
router.post('/confirm', paymentController.confirmPayment);

// Get transaction
router.get('/transaction/:transactionId', paymentController.getTransaction);

// Get user transactions
router.get('/transactions', paymentController.getUserTransactions);

// Payment methods
router.post('/methods', paymentController.savePaymentMethod);
router.get('/methods', paymentController.getUserPaymentMethods);
router.delete('/methods/:paymentMethodId', paymentController.deletePaymentMethod);

// Refund
router.post('/refund/:transactionId', paymentController.refundPayment);

// Analytics (admin only)
router.get('/analytics', paymentController.getPaymentAnalytics);

module.exports = router;
