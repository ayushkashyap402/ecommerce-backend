const Return = require('../models/Return');
const Order = require('../models/Order');
const paymentService = require('./paymentService');

/**
 * Create a return request
 */
const createReturnRequest = async (payload) => {
  const { orderId, userId, returnReason, returnReasonText, additionalComments, refundMethod, images } = payload;

  // Validate order exists and belongs to user
  const order = await Order.findOne({ orderId, userId });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if order is eligible for return
  if (order.status === 'cancelled') {
    const error = new Error('Cancelled orders cannot be returned');
    error.statusCode = 400;
    throw error;
  }

  if (order.status === 'pending' || order.status === 'confirmed') {
    const error = new Error('Order must be shipped or delivered before requesting a return');
    error.statusCode = 400;
    throw error;
  }

  // Check if return already exists for this order
  const existingReturn = await Return.findOne({ orderId, status: { $nin: ['cancelled', 'rejected'] } });
  if (existingReturn) {
    const error = new Error('A return request already exists for this order');
    error.statusCode = 400;
    throw error;
  }

  // Check return window (7 days from delivery)
  if (order.deliveredAt) {
    const daysSinceDelivery = Math.floor((Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 7) {
      const error = new Error('Return window has expired. Returns are only accepted within 7 days of delivery.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Create return request
  const returnData = {
    orderId,
    userId,
    items: order.items,
    returnReason,
    returnReasonText,
    additionalComments,
    refundMethod,
    images: images || [],
    refundAmount: order.pricing?.total || order.total,
    pickupAddress: order.deliveryAddress,
    status: 'requested'
  };

  const returnRequest = await Return.create(returnData);

  // Update order status to cancelled with return reason
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = `Return requested: ${returnReasonText}`;
  await order.save();

  return returnRequest;
};

/**
 * Get return request by ID
 */
const getReturnById = async (returnId, userId) => {
  const returnRequest = await Return.findOne({ returnId }).populate('order');
  
  if (!returnRequest) {
    const error = new Error('Return request not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify ownership
  if (userId && returnRequest.userId !== userId) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  return returnRequest;
};

/**
 * Get all returns for a user
 */
const getUserReturns = async (userId, filters = {}) => {
  const query = { userId };

  if (filters.status) {
    query.status = filters.status;
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [returns, total] = await Promise.all([
    Return.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order'),
    Return.countDocuments(query)
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get return by order ID
 */
const getReturnByOrderId = async (orderId, userId) => {
  const returnRequest = await Return.findOne({ orderId }).populate('order');
  
  if (!returnRequest) {
    return null;
  }

  // Verify ownership
  if (userId && returnRequest.userId !== userId) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  return returnRequest;
};

/**
 * Update return status (Admin only)
 */
const updateReturnStatus = async (returnId, status, adminId, notes) => {
  const returnRequest = await Return.findOne({ returnId });
  
  if (!returnRequest) {
    const error = new Error('Return request not found');
    error.statusCode = 404;
    throw error;
  }

  // Validate status transitions
  const validTransitions = {
    'requested': ['approved', 'rejected', 'cancelled'],
    'approved': ['pickup_scheduled', 'cancelled'],
    'pickup_scheduled': ['picked_up', 'cancelled'],
    'picked_up': ['received', 'cancelled'],
    'received': ['inspected'],
    'inspected': ['refund_initiated', 'rejected'],
    'refund_initiated': ['refund_completed'],
    'refund_completed': [],
    'rejected': [],
    'cancelled': []
  };

  if (!validTransitions[returnRequest.status].includes(status)) {
    const error = new Error(`Cannot transition from ${returnRequest.status} to ${status}`);
    error.statusCode = 400;
    throw error;
  }

  returnRequest.status = status;
  returnRequest.processedBy = adminId;

  if (notes) {
    returnRequest.adminNotes = notes;
  }

  // Update timestamps based on status
  switch (status) {
    case 'approved':
      // Return approved, schedule pickup
      break;
    case 'rejected':
      returnRequest.rejectedAt = new Date();
      if (notes) {
        returnRequest.rejectionReason = notes;
      }
      break;
    case 'pickup_scheduled':
      returnRequest.pickupScheduledDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      break;
    case 'picked_up':
      returnRequest.pickedUpAt = new Date();
      break;
    case 'received':
      returnRequest.receivedAt = new Date();
      break;
    case 'inspected':
      returnRequest.inspectedAt = new Date();
      if (notes) {
        returnRequest.inspectionNotes = notes;
      }
      break;
    case 'refund_initiated':
      returnRequest.refundInitiatedAt = new Date();
      // Initiate refund through payment service
      await initiateRefund(returnRequest);
      break;
    case 'refund_completed':
      returnRequest.refundCompletedAt = new Date();
      break;
    case 'cancelled':
      returnRequest.cancelledAt = new Date();
      if (notes) {
        returnRequest.cancellationReason = notes;
      }
      break;
  }

  await returnRequest.save();
  return returnRequest;
};

/**
 * Initiate refund for approved return
 */
const initiateRefund = async (returnRequest) => {
  try {
    const order = await Order.findOne({ orderId: returnRequest.orderId });
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Only initiate refund if payment was completed
    if (order.payment.status === 'completed' && order.payment.transactionId) {
      const refundResult = await paymentService.refundPayment(
        order.payment.transactionId,
        returnRequest.refundAmount,
        `Return approved: ${returnRequest.returnReasonText}`
      );

      returnRequest.refundTransactionId = refundResult.transactionId;
      
      // Update order payment status
      order.payment.status = 'refunded';
      await order.save();
    }
  } catch (error) {
    console.error('❌ Refund initiation failed:', error);
    throw error;
  }
};

/**
 * Cancel return request (User)
 */
const cancelReturnRequest = async (returnId, userId, reason) => {
  const returnRequest = await Return.findOne({ returnId, userId });
  
  if (!returnRequest) {
    const error = new Error('Return request not found');
    error.statusCode = 404;
    throw error;
  }

  // Can only cancel if in requested or approved status
  if (!['requested', 'approved'].includes(returnRequest.status)) {
    const error = new Error('Cannot cancel return at this stage');
    error.statusCode = 400;
    throw error;
  }

  returnRequest.status = 'cancelled';
  returnRequest.cancelledAt = new Date();
  returnRequest.cancellationReason = reason || 'Cancelled by user';
  
  await returnRequest.save();
  return returnRequest;
};

/**
 * Get all returns (Admin - filtered by their products)
 */
const getAdminReturns = async (adminId, filters = {}) => {
  // First get orders containing admin's products
  const orders = await Order.find({ 'items.productCreatedBy': adminId }).select('orderId');
  const orderIds = orders.map(o => o.orderId);

  const query = { orderId: { $in: orderIds } };

  if (filters.status) {
    query.status = filters.status;
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

  const [returns, total] = await Promise.all([
    Return.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order'),
    Return.countDocuments(query)
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get all returns (SuperAdmin)
 */
const getAllReturns = async (filters = {}) => {
  const query = {};

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

  const [returns, total] = await Promise.all([
    Return.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order'),
    Return.countDocuments(query)
  ]);

  return {
    returns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get return statistics
 */
const getReturnStats = async (adminId = null) => {
  let query = {};

  if (adminId) {
    // Get orders containing admin's products
    const orders = await Order.find({ 'items.productCreatedBy': adminId }).select('orderId');
    const orderIds = orders.map(o => o.orderId);
    query.orderId = { $in: orderIds };
  }

  const [
    totalReturns,
    pendingReturns,
    approvedReturns,
    rejectedReturns,
    completedReturns,
    totalRefundAmount
  ] = await Promise.all([
    Return.countDocuments(query),
    Return.countDocuments({ ...query, status: 'requested' }),
    Return.countDocuments({ ...query, status: { $in: ['approved', 'pickup_scheduled', 'picked_up', 'received', 'inspected', 'refund_initiated'] } }),
    Return.countDocuments({ ...query, status: 'rejected' }),
    Return.countDocuments({ ...query, status: 'refund_completed' }),
    Return.aggregate([
      { $match: { ...query, status: 'refund_completed' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ])
  ]);

  // Get return reasons breakdown
  const returnReasons = await Return.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$returnReason',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    totalReturns,
    pendingReturns,
    approvedReturns,
    rejectedReturns,
    completedReturns,
    totalRefundAmount: totalRefundAmount[0]?.total || 0,
    returnReasons: returnReasons.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
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
