const orderService = require('../services/orderService');
const { runAutoCancellationNow } = require('../services/autoCancellationService');
const jwt = require('jsonwebtoken');

const create = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ 
      message: 'Order created successfully',
      order 
    });
  } catch (err) {
    next(err);
  }
};

const listMine = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const orders = await orderService.listOrdersForUser(userId);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.query.userId;
    const order = await orderService.getOrderById(orderId, userId);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, cancellationReason } = req.body;
    const userId = req.query.userId;
    
    const order = await orderService.updateOrderStatus(orderId, status, userId, cancellationReason);
    
    // No need to manually notify - Change Stream will handle it automatically
    
    res.json({ 
      message: 'Order status updated',
      order 
    });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    let role;
    let userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        userId = decoded.sub;
        
        console.log('🔍 [Order Stats] Decoded JWT:', { role, userId, email: decoded.email });
      } catch (err) {
        console.log('⚠️  [Order Stats] Invalid token:', err.message);
      }
    }

    const stats = await orderService.getStats({ role, userId });
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

const getPending = async (req, res, next) => {
  try {
    let role;
    let userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        userId = decoded.sub;
      } catch (err) {
        console.log('⚠️  [Pending Orders] Invalid token:', err.message);
      }
    }

    const orders = await orderService.getPendingOrders({ role, userId });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

/**
 * Get orders for admin (only their products)
 */
const getAdminOrders = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await orderService.getOrdersForAdmin(decoded.sub, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders (SuperAdmin only)
 */
const getAllOrders = async (req, res, next) => {
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

    const result = await orderService.getAllOrders(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get admin analytics
 */
const getAdminAnalytics = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const analytics = await orderService.getAdminAnalytics(decoded.sub);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

/**
 * Get platform analytics (SuperAdmin only)
 */
const getPlatformAnalytics = async (req, res, next) => {
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

    const analytics = await orderService.getPlatformAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
};

/**
 * Manually trigger auto-cancellation (Admin/SuperAdmin only)
 */
const triggerAutoCancellation = async (req, res, next) => {
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

    const result = await runAutoCancellationNow();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel order (User can cancel their own order)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }

    const order = await orderService.cancelOrder(orderId, userId, reason);
    
    res.json({ 
      message: 'Order cancelled successfully',
      order 
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  listMine,
  getById,
  updateStatus,
  cancelOrder,
  getStats,
  getPending,
  getAdminOrders,
  getAllOrders,
  getAdminAnalytics,
  getPlatformAnalytics,
  triggerAutoCancellation
};

