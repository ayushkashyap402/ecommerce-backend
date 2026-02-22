const returnService = require('../services/returnService');
const jwt = require('jsonwebtoken');

/**
 * Create a return request
 */
const createReturnRequest = async (req, res, next) => {
  try {
    const { orderId, returnReason, returnReasonText, additionalComments, refundMethod, images } = req.body;
    
    // Get userId from token or body
    let userId = req.body.userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
      } catch (err) {
        console.log('⚠️  [Return Request] Invalid token:', err.message);
      }
    }

    if (!userId || !orderId || !returnReason || !returnReasonText) {
      return res.status(400).json({ 
        message: 'Missing required fields: userId, orderId, returnReason, returnReasonText' 
      });
    }

    const returnRequest = await returnService.createReturnRequest({
      orderId,
      userId,
      returnReason,
      returnReasonText,
      additionalComments,
      refundMethod: refundMethod || 'original',
      images: images || []
    });

    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      return: returnRequest
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get return request by ID
 */
const getReturnById = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    
    // Get userId from token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
        // SuperAdmin and Admin can view any return
        if (decoded.role === 'superadmin' || decoded.role === 'admin') {
          userId = null;
        }
      } catch (err) {
        console.log('⚠️  [Get Return] Invalid token:', err.message);
      }
    }

    const returnRequest = await returnService.getReturnById(returnId, userId);

    res.json(returnRequest);
  } catch (err) {
    next(err);
  }
};

/**
 * Get user's return requests
 */
const getUserReturns = async (req, res, next) => {
  try {
    // Get userId from token or query
    let userId = req.query.userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
      } catch (err) {
        console.log('⚠️  [User Returns] Invalid token:', err.message);
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const filters = {
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await returnService.getUserReturns(userId, filters);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get return by order ID
 */
const getReturnByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    // Get userId from token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
        // SuperAdmin and Admin can view any return
        if (decoded.role === 'superadmin' || decoded.role === 'admin') {
          userId = null;
        }
      } catch (err) {
        console.log('⚠️  [Get Return by Order] Invalid token:', err.message);
      }
    }

    const returnRequest = await returnService.getReturnByOrderId(orderId, userId);

    if (!returnRequest) {
      return res.status(404).json({ message: 'No return request found for this order' });
    }

    res.json(returnRequest);
  } catch (err) {
    next(err);
  }
};

/**
 * Update return status (Admin/SuperAdmin only)
 */
const updateReturnStatus = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const { status, notes } = req.body;

    // Verify admin/superadmin access
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const returnRequest = await returnService.updateReturnStatus(
      returnId,
      status,
      decoded.sub,
      notes
    );

    res.json({
      success: true,
      message: 'Return status updated successfully',
      return: returnRequest
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel return request (User)
 */
const cancelReturnRequest = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const { reason } = req.body;

    // Get userId from token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const returnRequest = await returnService.cancelReturnRequest(returnId, userId, reason);

    res.json({
      success: true,
      message: 'Return request cancelled successfully',
      return: returnRequest
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get admin returns (Admin only - filtered by their products)
 */
const getAdminReturns = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await returnService.getAdminReturns(decoded.sub, filters);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all returns (SuperAdmin only)
 */
const getAllReturns = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'SuperAdmin access required' });
    }

    const filters = {
      status: req.query.status,
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await returnService.getAllReturns(filters);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get return statistics
 */
const getReturnStats = async (req, res, next) => {
  try {
    let adminId = null;
    let role = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        adminId = decoded.sub;
      } catch (err) {
        console.log('⚠️  [Return Stats] Invalid token:', err.message);
      }
    }

    // Admin sees stats for their products only, SuperAdmin sees all
    const stats = await returnService.getReturnStats(
      role === 'admin' ? adminId : null
    );

    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReturnRequest,
  getReturnById,
  getUserReturns,
  getReturnByOrderId,
  updateReturnStatus,
  cancelReturnRequest,
  getAdminReturns,
  getAllReturns,
  getReturnStats
};
