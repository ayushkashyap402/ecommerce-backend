/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides middleware functions to protect routes based on user roles
 * and permissions.
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Require specific role(s)
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Require specific permission(s)
 * @param {string|string[]} permissions - Required permission(s)
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // SuperAdmin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const requiredPermissions = permissions.flat();

    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${requiredPermissions.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Require user to be authenticated (any role)
 */
const requireAuth = authenticate;

/**
 * Require user role
 */
const requireUser = [authenticate, requireRole('user')];

/**
 * Require admin role
 */
const requireAdmin = [authenticate, requireRole('admin', 'superadmin')];

/**
 * Require superadmin role
 */
const requireSuperAdmin = [authenticate, requireRole('superadmin')];

/**
 * Optional authentication (attach user if token exists, but don't require it)
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Check if user owns the resource
 * @param {string} paramName - Name of the parameter containing the user ID
 */
const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // SuperAdmin can access any resource
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    
    if (resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Check if admin owns the resource
 * @param {string} paramName - Name of the parameter containing the admin ID
 */
const requireAdminOwnership = (paramName = 'adminId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // SuperAdmin can access any resource
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if admin owns the resource
    const resourceAdminId = req.params[paramName] || req.query[paramName] || req.body[paramName];
    
    if (resourceAdminId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  requireAuth,
  requireUser,
  requireAdmin,
  requireSuperAdmin,
  optionalAuth,
  requireOwnership,
  requireAdminOwnership
};
