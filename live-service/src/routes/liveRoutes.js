const express = require('express');
const controller = require('../controllers/liveController');

const router = express.Router();

// Stats endpoint
router.get('/stats', controller.getStats);

router.get('/', controller.list);
router.post('/', controller.create);

module.exports = router;

