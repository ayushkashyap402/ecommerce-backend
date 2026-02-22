module.exports = {
  authServiceUrl: (process.env.AUTH_SERVICE_URL || 'http://auth-service:4001').trim(),
  productServiceUrl: (process.env.PRODUCT_SERVICE_URL || 'http://product-service:4002').trim(),
  cartServiceUrl: (process.env.CART_SERVICE_URL || 'http://cart-service:4003').trim(),
  orderServiceUrl: (process.env.ORDER_SERVICE_URL || 'http://order-service:4004').trim(),
  paymentServiceUrl: (process.env.PAYMENT_SERVICE_URL || 'http://payment-service:4005').trim(),
  liveServiceUrl: (process.env.LIVE_SERVICE_URL || 'http://live-service:4006').trim(),
  wishlistServiceUrl: (process.env.WISHLIST_SERVICE_URL || 'http://wishlist-service:4007').trim(),
  userServiceUrl: (process.env.USER_SERVICE_URL || 'http://user-service:4008').trim()
};
