# Render Deployment Guide for OutfitGo Backend

## Overview
Deploy all 9 microservices on Render.com. Each service will get its own URL.

## Prerequisites
- Render.com account (sign up with GitHub)
- GitHub repository pushed with all code
- MongoDB Atlas credentials ready
- Cloudinary credentials ready
- Razorpay credentials ready

---

## Service Deployment Order

Deploy in this order (internal services first, API Gateway last):

1. ✅ Auth Service
2. ✅ Product Service
3. ✅ Cart Service
4. ✅ Order Service
5. ✅ Payment Service
6. ✅ Live Service
7. ✅ Wishlist Service
8. ✅ User Service
9. ✅ API Gateway (LAST - after getting all service URLs)

---

## 1. AUTH SERVICE

### Create New Web Service
- **Name:** `outfitgo-auth-service`
- **Region:** Choose closest to you
- **Branch:** `main`
- **Root Directory:** `backend/auth-service`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`
- **Instance Type:** Free

### Environment Variables
```
NODE_ENV=production
PORT=4001
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/auth-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@outfitgo.com
SUPER_ADMIN_PASSWORD=Admin123!
```

### After Deployment
- Copy the service URL (e.g., `https://outfitgo-auth-service.onrender.com`)
- Test: `https://outfitgo-auth-service.onrender.com/health`

---

## 2. PRODUCT SERVICE

### Create New Web Service
- **Name:** `outfitgo-product-service`
- **Root Directory:** `backend/product-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4002
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/product-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
CLOUDINARY_NAME=ds7mdcdox
CLOUDINARY_API_KEY=899157241914633
CLOUDINARY_API_SECRET=RNYxGYSSSubWYZEt1h7Sx8PXk6U
```

### After Deployment
- Copy URL: `https://outfitgo-product-service.onrender.com`
- Test: `https://outfitgo-product-service.onrender.com/health`

---

## 3. CART SERVICE

### Create New Web Service
- **Name:** `outfitgo-cart-service`
- **Root Directory:** `backend/cart-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4003
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/cart-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
PRODUCT_SERVICE_URL=https://outfitgo-product-service.onrender.com
```

### After Deployment
- Copy URL: `https://outfitgo-cart-service.onrender.com`

---

## 4. ORDER SERVICE

### Create New Web Service
- **Name:** `outfitgo-order-service`
- **Root Directory:** `backend/order-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4004
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/order-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
PRODUCT_SERVICE_URL=https://outfitgo-product-service.onrender.com
CART_SERVICE_URL=https://outfitgo-cart-service.onrender.com
```

### After Deployment
- Copy URL: `https://outfitgo-order-service.onrender.com`

---

## 5. PAYMENT SERVICE

### Create New Web Service
- **Name:** `outfitgo-payment-service`
- **Root Directory:** `backend/payment-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4005
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/payment-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
ORDER_SERVICE_URL=https://outfitgo-order-service.onrender.com
CURRENCY=INR
```

### After Deployment
- Copy URL: `https://outfitgo-payment-service.onrender.com`

---

## 6. LIVE SERVICE

### Create New Web Service
- **Name:** `outfitgo-live-service`
- **Root Directory:** `backend/live-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4006
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/live-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
CLOUDINARY_NAME=ds7mdcdox
CLOUDINARY_API_KEY=899157241914633
CLOUDINARY_API_SECRET=RNYxGYSSSubWYZEt1h7Sx8PXk6U
```

### After Deployment
- Copy URL: `https://outfitgo-live-service.onrender.com`

---

## 7. WISHLIST SERVICE

### Create New Web Service
- **Name:** `outfitgo-wishlist-service`
- **Root Directory:** `backend/wishlist-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4007
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/wishlist-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
PRODUCT_SERVICE_URL=https://outfitgo-product-service.onrender.com
```

### After Deployment
- Copy URL: `https://outfitgo-wishlist-service.onrender.com`

---

## 8. USER SERVICE

### Create New Web Service
- **Name:** `outfitgo-user-service`
- **Root Directory:** `backend/user-service`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`

### Environment Variables
```
NODE_ENV=production
PORT=4008
MONGO_URI=mongodb+srv://kashyapayush707_db_user:iWcvORrwCZvmHfy9@cluster0.rshy8c1.mongodb.net/user-db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=outfitgo-super-secret-jwt-key-2026-change-in-production
CLOUDINARY_NAME=ds7mdcdox
CLOUDINARY_API_KEY=899157241914633
CLOUDINARY_API_SECRET=RNYxGYSSSubWYZEt1h7Sx8PXk6U
AUTH_SERVICE_URL=https://outfitgo-auth-service.onrender.com
```

### After Deployment
- Copy URL: `https://outfitgo-user-service.onrender.com`

---

## 9. API GATEWAY (DEPLOY LAST!)

### Create New Web Service
- **Name:** `outfitgo-api-gateway`
- **Root Directory:** `backend/api-gateway`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.production.js`

### Environment Variables
```
NODE_ENV=production
PORT=8080
CORS_ORIGINS=http://localhost:3000,https://your-admin-panel.vercel.app,https://your-mobile-app.com
AUTH_SERVICE_URL=https://outfitgo-auth-service.onrender.com
PRODUCT_SERVICE_URL=https://outfitgo-product-service.onrender.com
CART_SERVICE_URL=https://outfitgo-cart-service.onrender.com
ORDER_SERVICE_URL=https://outfitgo-order-service.onrender.com
PAYMENT_SERVICE_URL=https://outfitgo-payment-service.onrender.com
LIVE_SERVICE_URL=https://outfitgo-live-service.onrender.com
WISHLIST_SERVICE_URL=https://outfitgo-wishlist-service.onrender.com
USER_SERVICE_URL=https://outfitgo-user-service.onrender.com
```

### After Deployment
- Copy URL: `https://outfitgo-api-gateway.onrender.com`
- This is your MAIN API URL for frontend apps!

---

## Testing After Deployment

### 1. Health Check All Services
```bash
# API Gateway
curl https://outfitgo-api-gateway.onrender.com/health

# Auth Service
curl https://outfitgo-api-gateway.onrender.com/api/auth/health

# Products
curl https://outfitgo-api-gateway.onrender.com/api/products/health
```

### 2. Test Login
```bash
curl -X POST https://outfitgo-api-gateway.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@outfitgo.com",
    "password": "Admin123!"
  }'
```

### 3. Test Products
```bash
curl https://outfitgo-api-gateway.onrender.com/api/products
```

---

## Important Notes

### Free Tier Limitations
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds (cold start)
- 750 hours/month free (enough for 1 service 24/7)
- For multiple services, consider upgrading to paid plan ($7/month per service)

### Service URLs Tracking
Keep a note of all service URLs:
```
Auth:     https://outfitgo-auth-service.onrender.com
Product:  https://outfitgo-product-service.onrender.com
Cart:     https://outfitgo-cart-service.onrender.com
Order:    https://outfitgo-order-service.onrender.com
Payment:  https://outfitgo-payment-service.onrender.com
Live:     https://outfitgo-live-service.onrender.com
Wishlist: https://outfitgo-wishlist-service.onrender.com
User:     https://outfitgo-user-service.onrender.com
Gateway:  https://outfitgo-api-gateway.onrender.com (MAIN URL)
```

### CORS Configuration
Update CORS_ORIGINS in API Gateway after deploying frontend:
```
CORS_ORIGINS=https://your-admin-panel.vercel.app,https://your-mobile-app-domain.com
```

### Database Seeding
After auth-service is deployed, seed super admin:
```bash
# In Render dashboard, go to auth-service
# Click "Shell" tab
# Run:
npm run seed
```

---

## Troubleshooting

### Service Not Starting
- Check logs in Render dashboard
- Verify all environment variables are set
- Check MongoDB connection string

### 502 Bad Gateway
- Service is sleeping (wait 30-50 seconds)
- Service crashed (check logs)

### CORS Errors
- Update CORS_ORIGINS in API Gateway
- Redeploy API Gateway after updating

### Authentication Errors
- Verify JWT_SECRET is same across all services
- Check super admin credentials
- Run seed script in auth-service

---

## Cost Optimization

### Free Tier Strategy
- Keep only API Gateway on free tier (always active)
- Other services can sleep (they wake up when called)
- Total cost: $0/month (with cold starts)

### Paid Strategy ($7/month per service)
- Keep API Gateway + Auth Service always active
- Other services can be free tier
- Total cost: $14/month (better performance)

### Full Production ($63/month)
- All 9 services on paid tier
- No cold starts
- Best performance

---

## Next Steps After Backend Deployment

1. ✅ Deploy Admin Panel on Vercel/Netlify
2. ✅ Update admin panel API_URL to API Gateway URL
3. ✅ Build mobile app with Expo EAS
4. ✅ Update mobile app API URL
5. ✅ Test complete flow end-to-end

---

## Support

If you face any issues:
1. Check Render logs for each service
2. Test individual service health endpoints
3. Verify environment variables
4. Check MongoDB Atlas network access (allow all IPs: 0.0.0.0/0)
