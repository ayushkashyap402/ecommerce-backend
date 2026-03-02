const express = require('express');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
const superAdminRoutes = require('./superAdminRoutes');

const router = express.Router();

// Admin Routes - for admin panel
router.use('/admin', adminRoutes);

// SuperAdmin Routes - for superadmin only
router.use('/superadmin', superAdminRoutes);

// User Routes - for mobile app
router.use('/user', userRoutes);

// Legacy routes for backward compatibility
router.use(userRoutes);

module.exports = router;

