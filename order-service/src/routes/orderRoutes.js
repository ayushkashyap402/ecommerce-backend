const express = require('express');
const controller = require('../controllers/orderController');

const router = express.Router();

// Stats and Analytics endpoints
router.get('/stats', controller.getStats);
router.get('/pending', controller.getPending);
router.get('/analytics/admin', controller.getAdminAnalytics);
router.get('/analytics/platform', controller.getPlatformAnalytics);

// Admin endpoints
router.get('/admin/orders', controller.getAdminOrders);
router.post('/admin/auto-cancel', controller.triggerAutoCancellation);

// SuperAdmin endpoints
router.get('/superadmin/all', controller.getAllOrders);

// Order CRUD
router.get('/', controller.listMine);
router.post('/', controller.create);
router.get('/:orderId', controller.getById);
router.patch('/:orderId/status', controller.updateStatus);
router.post('/:orderId/cancel', controller.cancelOrder);

module.exports = router;

