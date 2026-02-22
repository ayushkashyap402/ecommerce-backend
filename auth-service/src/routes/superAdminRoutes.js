const express = require('express');
const superAdminController = require('../controllers/superAdminController');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and SuperAdmin role
router.use(authenticate);
router.use(requireSuperAdmin);

// Platform stats
router.get('/stats', superAdminController.getPlatformStats);

// User management
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:userId', superAdminController.getUserById);
router.patch('/users/:userId/status', superAdminController.updateUserStatus);
router.delete('/users/:userId', superAdminController.deleteUser);

// Admin management (these already exist in adminRoutes.js, so we'll add only new ones)
router.get('/admins', superAdminController.getAllAdmins);
router.get('/admins/:adminId', superAdminController.getAdminById);

module.exports = router;
