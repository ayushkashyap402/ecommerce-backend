const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// In-memory store for rate limiting (use Redis in production)
const impersonationAttempts = new Map();
const MAX_ATTEMPTS = 5; // Max 5 impersonations per hour per SuperAdmin
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Generate impersonation token for SuperAdmin to view admin's dashboard
 * This creates a temporary JWT token for the target admin
 * 
 * Security Features:
 * - Only SuperAdmin can impersonate
 * - Rate limiting (5 per hour)
 * - Short token expiry (1 hour)
 * - Audit trail (logs who impersonated whom)
 * - Token includes impersonation flag
 */
const generateImpersonationToken = async (req, res, next) => {
  try {
    // Security Check 1: Only SuperAdmin can impersonate
    if (req.user.role !== 'superadmin') {
      console.warn(`⚠️  Unauthorized impersonation attempt by ${req.user.email} (role: ${req.user.role})`);
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can impersonate admins'
      });
    }

    const { adminId } = req.params;
    const superAdminId = req.user.sub;

    // Security Check 2: Rate limiting
    const now = Date.now();
    const attempts = impersonationAttempts.get(superAdminId) || [];
    
    // Clean old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      console.warn(`⚠️  Rate limit exceeded for SuperAdmin ${req.user.email}`);
      return res.status(429).json({
        success: false,
        message: 'Too many impersonation attempts. Please try again later.',
        retryAfter: Math.ceil((recentAttempts[0] + RATE_LIMIT_WINDOW - now) / 1000)
      });
    }

    // Security Check 3: Validate admin ID format
    if (!adminId || !adminId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID format'
      });
    }

    // Security Check 4: Find the admin to impersonate
    const admin = await Admin.findById(adminId);
    if (!admin) {
      console.warn(`⚠️  Impersonation attempt for non-existent admin: ${adminId}`);
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Security Check 5: Verify admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cannot impersonate inactive admin'
      });
    }

    // Security Check 6: Prevent impersonating another SuperAdmin
    if (admin.role === 'superadmin') {
      console.warn(`⚠️  Attempt to impersonate SuperAdmin by ${req.user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Cannot impersonate SuperAdmin accounts'
      });
    }

    // Update rate limiting
    recentAttempts.push(now);
    impersonationAttempts.set(superAdminId, recentAttempts);

    // Generate temporary token for the admin (shorter expiry for security)
    const impersonationPayload = {
      sub: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || ['manage_products', 'manage_orders', 'view_analytics'], // Add default admin permissions
      impersonatedBy: superAdminId, // Track who is impersonating
      isImpersonation: true, // Flag to identify impersonation tokens
      iat: Math.floor(Date.now() / 1000),
    };

    const impersonationToken = jwt.sign(
      impersonationPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Short expiry for security
    );

    // Audit log
    console.log(`✅ Impersonation token generated:`, {
      superAdmin: req.user.email,
      targetAdmin: admin.email,
      timestamp: new Date().toISOString(),
      expiresIn: '1h'
    });

    res.json({
      success: true,
      token: impersonationToken,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      expiresIn: '1h',
      message: 'Impersonation token generated successfully'
    });

  } catch (err) {
    console.error('❌ Impersonation token generation failed:', err);
    next(err);
  }
};

module.exports = {
  generateImpersonationToken
};
