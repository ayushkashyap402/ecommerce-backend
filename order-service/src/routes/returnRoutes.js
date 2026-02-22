const express = require('express');
const returnController = require('../controllers/returnController');

const router = express.Router();

// Return statistics
router.get('/stats', returnController.getReturnStats);

// Admin endpoints
router.get('/admin/returns', returnController.getAdminReturns);

// SuperAdmin endpoints
router.get('/superadmin/all', returnController.getAllReturns);

// User endpoints
router.post('/', returnController.createReturnRequest);
router.get('/', returnController.getUserReturns);
router.get('/:returnId', returnController.getReturnById);
router.get('/order/:orderId', returnController.getReturnByOrderId);
router.patch('/:returnId/cancel', returnController.cancelReturnRequest);

// Admin/SuperAdmin endpoints
router.patch('/:returnId/status', returnController.updateReturnStatus);

module.exports = router;
