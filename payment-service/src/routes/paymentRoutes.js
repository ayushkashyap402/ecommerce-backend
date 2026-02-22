const express = require('express');
const controller = require('../controllers/paymentController');

const router = express.Router();

// Create Razorpay Order
router.post('/razorpay/create', controller.createRazorpayOrder);

// Verify Payment
router.post('/razorpay/verify', controller.verifyPayment);

// Webhook Handler (No auth required)
router.post('/razorpay/webhook', controller.handleWebhook);

// Get Payment Details
router.get('/:paymentId', controller.getPaymentDetails);

// Get User Payments
router.get('/user/payments', controller.getUserPayments);

// Initiate Refund (Admin only)
router.post('/:paymentId/refund', controller.initiateRefund);

module.exports = router;
