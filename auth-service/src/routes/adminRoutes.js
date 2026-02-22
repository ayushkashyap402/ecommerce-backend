const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin Authentication Routes
router.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  authController.adminLogin
);

// Admin profile routes (require authentication)
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

// Public admin profile (for mobile app to view seller profile)
router.get('/profile/:adminId', authController.getAdminProfile);

// Super Admin can manage admin users
router.get('/admins', authenticate, requireSuperAdmin, authController.listAdmins);

router.post(
  '/admins',
  authenticate, 
  requireSuperAdmin,
  [
    body('name').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('permissions').optional().isArray()
  ],
  authController.createAdmin
);

router.delete('/admins/:id', authenticate, requireSuperAdmin, authController.deleteAdmin);

router.put(
  '/admins/:id',
  authenticate,
  requireSuperAdmin,
  [
    body('name').optional().isString().isLength({ min: 2 }),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('permissions').optional().isArray()
  ],
  authController.updateAdmin
);

module.exports = router;
