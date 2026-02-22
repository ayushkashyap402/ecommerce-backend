const express = require('express');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

// Admin Routes - for admin panel
router.use('/admin', adminRoutes);

// User Routes - for mobile app
router.use('/user', userRoutes);

// Legacy routes for backward compatibility
router.use(userRoutes);

module.exports = router;

