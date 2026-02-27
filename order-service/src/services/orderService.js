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

/**
 * Cancel order by user
 */
const cancelOrder = async (orderId, userId, reason) => {
  const order = await Order.findOne({ orderId, userId });
  
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Check if order can be cancelled
  const cancellableStatuses = ['pending', 'confirmed'];
  if (!cancellableStatuses.includes(order.status)) {
    const error = new Error(`Cannot cancel order with status: ${order.status}`);
    error.statusCode = 400;
    throw error;
  }
  
  // Update order status to cancelled
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.cancelledBy = 'customer';
  
  // If payment was completed, mark for refund
  if (order.payment.status === 'completed' || order.payment.status === 'paid') {
    order.payment.status = 'refund_pending';
    order.payment.refundInitiatedAt = new Date();
  }
  
  await order.save();
  
  console.log(`✅ Order ${orderId} cancelled by user ${userId}. Reason: ${reason}`);
  
  return order;
};

const getStats = async ({ role, userId } = {}) => {
  let query = {};
  
  // Admin sees only orders containing their products
  if (role === 'admin' && userId) {
    query = { 'items.productCreatedBy': userId };
    console.log('📊 [Order Stats] Admin query:', { userId, query });
  }
  // SuperAdmin sees all orders (no filter)
  
  const total = await Order.countDocuments(query);
  console.log('📊 [Order Stats] Total orders found:', total);
  
  // Calculate revenue (exclude cancelled orders)
  let totalRevenue = 0;
  const revenueQuery = { ...query, status: { $ne: 'cancelled' } }; // Exclude cancelled orders
  
  if (role === 'admin' && userId) {
    // For admin, calculate revenue only from their products (non-cancelled orders)
    const orders = await Order.find(revenueQuery);
    console.log('📊 [Order Stats] Non-cancelled orders for admin:', orders.length);
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.productCreatedBy && item.productCreatedBy.toString() === userId.toString()) {
          const itemRevenue = item.price * item.quantity;
          totalRevenue += itemRevenue;
          console.log('📊 [Order Stats] Item revenue:', { 
            orderId: order.orderId,
            productId: item.productId, 
            price: item.price, 
            quantity: item.quantity,
            itemRevenue 
          });
        }
      });
    });
    console.log('📊 [Order Stats] Total admin revenue:', totalRevenue);
  } else {
    // For superadmin, get total revenue from all non-cancelled orders
    const revenue = await Order.aggregate([
      { $match: revenueQuery },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);
    totalRevenue = revenue[0]?.total || 0;
    console.log('📊 [Order Stats] SuperAdmin revenue:', totalRevenue);
  }
  
  // Today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayQuery = { ...query, createdAt: { $gte: today } };
  const todayOrders = await Order.countDocuments(todayQuery);
  
  // Pending orders count
  const pendingQuery = { ...query, status: 'pending' };
  const pendingOrders = await Order.countDocuments(pendingQuery);
  
  // Cancelled orders count
  const cancelledQuery = { ...query, status: 'cancelled' };
  const cancelledOrders = await Order.countDocuments(cancelledQuery);
  
  console.log('📊 [Order Stats] Final stats:', {
    totalOrders: total,
    totalRevenue,
    todayOrders,
    pendingOrders,
    cancelledOrders
  });
  
  return {
    totalOrders: total,
    count: total,
    totalRevenue: totalRevenue,
    revenue: totalRevenue,
    todayOrders,
    pendingOrders,
    cancelledOrders
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
      .limit(limit)
      .lean(),
    Order.countDocuments(query)
  ]);
  
  // Populate seller information for each item (for multi-seller orders)
  const Admin = require('../models/Admin');
  const SuperAdmin = require('../models/SuperAdmin');
  
  // Get all unique productCreatedBy IDs
  const createdByIds = new Set();
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (item.productCreatedBy) {
        createdByIds.add(item.productCreatedBy.toString());
      }
    });
  });
  
  // Fetch all admins and superadmins
  const [admins, superAdmins] = await Promise.all([
    Admin.find({ _id: { $in: Array.from(createdByIds) } }).select('name email role').lean(),
    SuperAdmin.find({ _id: { $in: Array.from(createdByIds) } }).select('name email role').lean()
  ]);
  
  // Create a map of creators
  const creatorsMap = new Map();
  admins.forEach(a => creatorsMap.set(a._id.toString(), { name: a.name, email: a.email, role: a.role || 'admin' }));
  superAdmins.forEach(sa => creatorsMap.set(sa._id.toString(), { name: sa.name, email: sa.email, role: 'superadmin' }));
  
  // Add seller info to each item
  const ordersWithSellerInfo = orders.map(order => ({
    ...order,
    items: order.items?.map(item => {
      const creator = item.productCreatedBy ? creatorsMap.get(item.productCreatedBy.toString()) : null;
      return {
        ...item,
        productCreatedByName: creator ? creator.name : 'Unknown',
        productCreatedByRole: creator ? creator.role : 'admin'
      };
    })
  }));
  
  return {
    orders: ordersWithSellerInfo,
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
      .limit(limit)
      .lean(),
    Order.countDocuments(query)
  ]);
  
  // Populate seller information for each item
  const Admin = require('../models/Admin');
  const SuperAdmin = require('../models/SuperAdmin');
  
  // Get all unique productCreatedBy IDs
  const createdByIds = new Set();
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (item.productCreatedBy) {
        createdByIds.add(item.productCreatedBy.toString());
      }
    });
  });
  
  // Fetch all admins and superadmins
  const [admins, superAdmins] = await Promise.all([
    Admin.find({ _id: { $in: Array.from(createdByIds) } }).select('name email role').lean(),
    SuperAdmin.find({ _id: { $in: Array.from(createdByIds) } }).select('name email role').lean()
  ]);
  
  // Create a map of creators
  const creatorsMap = new Map();
  admins.forEach(a => creatorsMap.set(a._id.toString(), { name: a.name, email: a.email, role: a.role || 'admin' }));
  superAdmins.forEach(sa => creatorsMap.set(sa._id.toString(), { name: sa.name, email: sa.email, role: 'superadmin' }));
  
  // Add seller info to each item
  const ordersWithSellerInfo = orders.map(order => ({
    ...order,
    items: order.items?.map(item => {
      const creator = item.productCreatedBy ? creatorsMap.get(item.productCreatedBy.toString()) : null;
      return {
        ...item,
        productCreatedByName: creator ? creator.name : 'Unknown',
        productCreatedByRole: creator ? creator.role : 'admin'
      };
    })
  }));
  
  return {
    orders: ordersWithSellerInfo,
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
    topAdmins,
    salesByCountry
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
    ]),
    // Sales by Country
    Order.aggregate([
      {
        $group: {
          _id: '$deliveryAddress.country',
          totalSales: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ])
  ]);
  
  // Calculate growth percentage for each country (comparing with previous period)
  const salesByCountryWithGrowth = await Promise.all(
    salesByCountry.map(async (country) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const [currentPeriod, previousPeriod] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              'deliveryAddress.country': country._id,
              createdAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$pricing.total' }
            }
          }
        ]),
        Order.aggregate([
          {
            $match: {
              'deliveryAddress.country': country._id,
              createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$pricing.total' }
            }
          }
        ])
      ]);
      
      const currentTotal = currentPeriod[0]?.total || 0;
      const previousTotal = previousPeriod[0]?.total || 0;
      
      let growth = 0;
      if (previousTotal > 0) {
        growth = ((currentTotal - previousTotal) / previousTotal) * 100;
      } else if (currentTotal > 0) {
        growth = 100;
      }
      
      return {
        country: country._id || 'Unknown',
        totalSales: country.totalSales,
        orderCount: country.orderCount,
        growth: Math.round(growth * 10) / 10 // Round to 1 decimal
      };
    })
  );
  
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
    topAdmins,
    salesByCountry: salesByCountryWithGrowth
  };
};

module.exports = {
  createOrder,
  listOrdersForUser,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getStats,
  getPendingOrders,
  getOrdersForAdmin,
  getAllOrders,
  getAdminAnalytics,
  getPlatformAnalytics
};

