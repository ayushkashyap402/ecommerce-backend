const Order = require('../models/Order');

const createOrder = async (payload) => {
  // Calculate estimated delivery (5 days from now)
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  
  const orderData = {
    ...payload,
    estimatedDelivery,
    status: 'pending'
  };
  
  return Order.create(orderData);
};

const listOrdersForUser = userId => {
  return Order.find({ userId }).sort({ createdAt: -1 }).limit(50);
};

const getOrderById = async (orderId, userId) => {
  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const updateOrderStatus = async (orderId, status, userId, cancellationReason = null) => {
  const order = await Order.findOne({ orderId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Validate status transitions
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [], // Cannot change from delivered
    'cancelled': [] // Cannot change from cancelled
  };
  
  if (!validTransitions[order.status].includes(status)) {
    const error = new Error(`Cannot transition from ${order.status} to ${status}`);
    error.statusCode = 400;
    throw error;
  }
  
  // Only allow user to cancel their own orders (and only if pending/confirmed)
  if (userId && order.userId !== userId && status === 'cancelled') {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }
  
  order.status = status;
  
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    // For COD, mark payment as completed when delivered
    if (order.payment.method === 'cod') {
      order.payment.status = 'completed';
      order.payment.paidAt = new Date();
      
      // Update transaction status to success
      const Transaction = require('../models/Transaction');
      await Transaction.findOneAndUpdate(
        { orderId: order.orderId },
        { 
          status: 'success',
          completedAt: new Date()
        }
      );
    }
  } else if (status === 'cancelled') {
    order.cancelledAt = new Date();
    
    // Set cancellation reason
    if (cancellationReason) {
      order.cancellationReason = cancellationReason;
    } else if (!order.cancellationReason) {
      order.cancellationReason = userId ? 'Cancelled by customer' : 'Cancelled by admin';
    }
    
    // If payment was completed, mark for refund
    if (order.payment.status === 'completed') {
      order.payment.status = 'refunded';
    }
  }
  
  await order.save();
  return order;
};

const getStats = async ({ role, userId } = {}) => {
  let query = {};
  
  // Admin sees only orders containing their products
  if (role === 'admin' && userId) {
    query = { 'items.productCreatedBy': userId };
  }
  // SuperAdmin sees all orders (no filter)
  
  const total = await Order.countDocuments(query);
  const revenue = await Order.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$pricing.total' } } }
  ]);
  
  return {
    total,
    count: total,
    revenue: revenue[0]?.total || 0
  };
};

const getPendingOrders = async ({ role, userId } = {}) => {
  let query = { status: 'pending' };
  
  // Admin sees only pending orders containing their products
  if (role === 'admin' && userId) {
    query['items.productCreatedBy'] = userId;
  }
  // SuperAdmin sees all pending orders
  
  return Order.find(query)
    .sort({ createdAt: -1 })
    .limit(20);
};

/**
 * Get orders for admin (only orders containing their products)
 */
const getOrdersForAdmin = async (adminId, filters = {}) => {
  const query = {
    'items.productCreatedBy': adminId
  };
  
  // Apply status filter if provided
  if (filters.status) {
    query.status = filters.status;
  }
  
  // Apply date range filter if provided
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;
  
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query)
  ]);
  
  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get all orders (SuperAdmin only)
 */
const getAllOrders = async (filters = {}) => {
  const query = {};
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.userId) {
    query.userId = filters.userId;
  }
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;
  
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query)
  ]);
  
  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get admin analytics
 */
const getAdminAnalytics = async (adminId) => {
  const query = { 'items.productCreatedBy': adminId };
  
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    revenueData
  ] = await Promise.all([
    Order.countDocuments(query),
    Order.countDocuments({ ...query, status: 'pending' }),
    Order.countDocuments({ ...query, status: 'delivered' }),
    Order.countDocuments({ ...query, status: 'cancelled' }),
    Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      }
    ])
  ]);
  
  // Get recent orders
  const recentOrders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('orderId userId status pricing.total createdAt');
  
  // Get orders by status
  const ordersByStatus = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: revenueData[0]?.totalRevenue || 0,
    avgOrderValue: revenueData[0]?.avgOrderValue || 0,
    recentOrders,
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

/**
 * Get platform-wide analytics (SuperAdmin only)
 */
const getPlatformAnalytics = async () => {
  const [
    totalOrders,
    totalUsers,
    totalRevenue,
    ordersByStatus,
    recentOrders,
    topAdmins
  ] = await Promise.all([
    Order.countDocuments(),
    Order.distinct('userId').then(users => users.length),
    Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' },
          avg: { $avg: '$pricing.total' }
        }
      }
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderId userId status pricing.total createdAt'),
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productCreatedBy',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ])
  ]);
  
  return {
    totalOrders,
    totalUsers,
    totalRevenue: totalRevenue[0]?.total || 0,
    avgOrderValue: totalRevenue[0]?.avg || 0,
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    recentOrders,
    topAdmins
  };
};

module.exports = {
  createOrder,
  listOrdersForUser,
  getOrderById,
  updateOrderStatus,
  getStats,
  getPendingOrders,
  getOrdersForAdmin,
  getAllOrders,
  getAdminAnalytics,
  getPlatformAnalytics
};

