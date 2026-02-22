const jwt = require('jsonwebtoken');

// Generic authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token' 
    });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
  }
  return next();
};

// Require super admin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      success: false,
      message: 'Super admin access required' 
    });
  }
  return next();
};

// Authorization middleware for specific permissions
const authorize = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Super admin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user has specific permission (for regular admins)
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ 
      success: false,
      message: `Permission '${permission}' required` 
    });
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  authorize
};
