const socketHandler = require('./socketHandler');

class LiveEvents {
  constructor() {
    this.stats = {
      activeUsers: 0,
      currentOrders: 0,
      liveRevenue: 0,
      totalOrders: 0,
      totalProducts: 0
    };
    
    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // Simulate real-time updates
    setInterval(() => {
      this.updateStats();
    }, 5000);

    // Listen for external events
    process.on('message', (msg) => {
      if (msg.type === 'order_update') {
        this.handleOrderUpdate(msg.data);
      } else if (msg.type === 'product_update') {
        this.handleProductUpdate(msg.data);
      }
    });
  }

  updateStats() {
    // Simulate stats changes
    this.stats.activeUsers = Math.floor(Math.random() * 100) + 50;
    this.stats.currentOrders = Math.floor(Math.random() * 20) + 5;
    this.stats.liveRevenue = Math.floor(Math.random() * 10000) + 1000;
    
    socketHandler.broadcastStats(this.stats);
  }

  handleOrderUpdate(orderData) {
    this.stats.currentOrders = (this.stats.currentOrders || 0) + 1;
    this.stats.totalOrders = (this.stats.totalOrders || 0) + 1;
    this.stats.liveRevenue += orderData.total || 0;
    
    socketHandler.broadcastOrderUpdate(orderData);
    socketHandler.broadcastStats(this.stats);
  }

  handleProductUpdate(productData) {
    socketHandler.broadcastProductUpdate(productData);
  }

  getStats() {
    return this.stats;
  }

  // Emit custom events
  emitEvent(eventType, data) {
    socketHandler.broadcast({
      type: eventType,
      data
    });
  }

  // Handle user activity
  trackUserActivity(userId, activity) {
    socketHandler.broadcast({
      type: 'user_activity',
      userId,
      activity,
      timestamp: new Date().toISOString()
    });
  }

  // Handle cart updates
  broadcastCartUpdate(cartData) {
    socketHandler.broadcast({
      type: 'cart_update',
      data: cartData
    });
  }

  // Handle inventory updates
  broadcastInventoryUpdate(inventoryData) {
    socketHandler.broadcast({
      type: 'inventory_update',
      data: inventoryData
    });
  }
}

module.exports = new LiveEvents();
