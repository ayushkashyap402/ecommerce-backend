const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/', profileController.getProfile);

// Update user profile
router.put('/', profileController.updateProfile);

// Upload avatar
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

// Delete avatar
router.delete('/avatar', profileController.deleteAvatar);

// Update preferences
router.put('/preferences', profileController.updatePreferences);

// Get user stats
router.get('/stats', profileController.getStats);

module.exports = router;
