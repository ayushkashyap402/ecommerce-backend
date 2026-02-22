const WebSocket = require('ws');

class SocketHandler {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');
      
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        connected: new Date(),
        lastPing: new Date()
      });

      ws.clientId = clientId;

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        message: 'Connected to live service',
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid JSON received:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        this.clients.delete(clientId);
        this.broadcastClientCount();
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Ping/Pong for connection health
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = new Date();
        }
      });

      this.broadcastClientCount();
    });

    // Set up ping interval
    setInterval(() => {
      this.pingClients();
    }, 30000);

    console.log('WebSocket server initialized');
  }

  generateClientId() {
    return Math.random().toString(36).substr(2, 9);
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        client.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'subscribe':
        // Handle subscription to specific events
        client.subscriptions = message.events || [];
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          events: client.subscriptions,
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  pingClients() {
    const now = new Date();
    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing > 60000) {
        // Client hasn't responded to ping, disconnect
        client.ws.terminate();
        this.clients.delete(clientId);
      } else {
        client.ws.ping();
      }
    });
    this.broadcastClientCount();
  }

  broadcast(data, excludeClientId = null) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  broadcastClientCount() {
    this.broadcast({
      type: 'client_count',
      count: this.clients.size
    });
  }

  broadcastStats(stats) {
    this.broadcast({
      type: 'stats',
      data: stats
    });
  }

  broadcastOrderUpdate(orderData) {
    this.broadcast({
      type: 'order_update',
      data: orderData
    });
  }

  broadcastProductUpdate(productData) {
    this.broadcast({
      type: 'product_update',
      data: productData
    });
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new SocketHandler();
