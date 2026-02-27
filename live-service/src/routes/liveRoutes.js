const express = require('express');
const controller = require('../controllers/liveController');
const reelController = require('../controllers/reelController');

const router = express.Router();

// Stats endpoint - now returns real data
router.get('/stats', reelController.getStats);

// Live sessions (old)
router.get('/sessions', controller.list);
router.post('/sessions', controller.create);

// Reels routes
router.use('/reels', require('./reelRoutes'));

module.exports = router;

