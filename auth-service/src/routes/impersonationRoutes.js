const express = require('express');
const { generateImpersonationToken } = require('../controllers/impersonationController');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

const router = express.Router();

// Generate impersonation token (SuperAdmin only)
router.post('/impersonate/:adminId', authenticate, requireSuperAdmin, generateImpersonationToken);

module.exports = router;
