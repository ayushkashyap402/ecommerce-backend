const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reelController');
const auth = require('../middleware/auth');

// Public routes
router.get('/live', reelController.getLiveReels);
router.get('/:id', reelController.getReelById);
router.get('/:id/comments', reelController.getComments);

// Protected routes (require authentication)
router.use(auth);

router.post('/', reelController.createReel);
router.get('/', reelController.getReels);
router.put('/:id', reelController.updateReel);
router.delete('/:id', reelController.deleteReel);

router.post('/:id/start', reelController.startLive);
router.post('/:id/end', reelController.endLive);
router.post('/:id/like', reelController.toggleLike);

router.post('/:id/comments', reelController.addComment);
router.delete('/:id/comments/:commentId', reelController.deleteComment);

router.post('/:id/track/view', reelController.trackProductView);
router.post('/:id/track/cart', reelController.trackAddToCart);
router.post('/:id/track/purchase', reelController.trackPurchase);

router.post('/upload', reelController.uploadMedia);

module.exports = router;
