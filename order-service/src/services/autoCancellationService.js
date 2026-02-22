const cron = require('node-cron');
const Order = require('../models/Order');

/**
 * Auto-cancel orders that are not delivered before estimated delivery date
 * Runs every day at midnight
 */
const startAutoCancellationJob = () => {
  // Run every day at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🔄 Running auto-cancellation job...');
      
      const now = new Date();
      
      // Find orders that:
      // 1. Are not in final states (delivered/cancelled)
      // 2. Have passed their estimated delivery date
      const overdueOrders = await Order.find({
        status: { $nin: ['delivered', 'cancelled'] },
        estimatedDelivery: { $lt: now }
      });
      
      if (overdueOrders.length === 0) {
        console.log('✅ No overdue orders found');
        return;
      }
      
      console.log(`⚠️  Found ${overdueOrders.length} overdue orders`);
      
      let cancelledCount = 0;
      
      for (const order of overdueOrders) {
        try {
          order.status = 'cancelled';
          order.cancelledAt = now;
          order.cancellationReason = 'Automatically cancelled - delivery deadline exceeded';
          
          // If payment was completed, mark for refund
          if (order.payment.status === 'completed') {
            order.payment.status = 'refunded';
          }
          
          await order.save();
          cancelledCount++;
          
          console.log(`❌ Auto-cancelled order: ${order.orderId} (estimated: ${order.estimatedDelivery})`);
        } catch (err) {
          console.error(`Failed to cancel order ${order.orderId}:`, err.message);
        }
      }
      
      console.log(`✅ Auto-cancellation complete: ${cancelledCount}/${overdueOrders.length} orders cancelled`);
    } catch (error) {
      console.error('❌ Auto-cancellation job failed:', error);
    }
  });
  
  console.log('✅ Auto-cancellation job scheduled (runs daily at midnight)');
};

/**
 * Manually trigger auto-cancellation (for testing)
 */
const runAutoCancellationNow = async () => {
  try {
    console.log('🔄 Running manual auto-cancellation...');
    
    const now = new Date();
    
    const overdueOrders = await Order.find({
      status: { $nin: ['delivered', 'cancelled'] },
      estimatedDelivery: { $lt: now }
    });
    
    if (overdueOrders.length === 0) {
      return { success: true, message: 'No overdue orders found', cancelled: 0 };
    }
    
    let cancelledCount = 0;
    const cancelledOrders = [];
    
    for (const order of overdueOrders) {
      try {
        order.status = 'cancelled';
        order.cancelledAt = now;
        order.cancellationReason = 'Automatically cancelled - delivery deadline exceeded';
        
        if (order.payment.status === 'completed') {
          order.payment.status = 'refunded';
        }
        
        await order.save();
        cancelledCount++;
        cancelledOrders.push(order.orderId);
      } catch (err) {
        console.error(`Failed to cancel order ${order.orderId}:`, err.message);
      }
    }
    
    return {
      success: true,
      message: `Cancelled ${cancelledCount} overdue orders`,
      cancelled: cancelledCount,
      total: overdueOrders.length,
      orders: cancelledOrders
    };
  } catch (error) {
    console.error('❌ Manual auto-cancellation failed:', error);
    return {
      success: false,
      message: error.message,
      cancelled: 0
    };
  }
};

module.exports = {
  startAutoCancellationJob,
  runAutoCancellationNow
};
