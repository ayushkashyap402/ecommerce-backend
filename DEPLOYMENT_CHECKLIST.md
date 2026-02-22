# 🚀 Render Deployment Checklist

## Pre-Deployment Setup

### 1. GitHub Repository
- [ ] Push all code to GitHub
- [ ] Ensure all services have proper folder structure
- [ ] Commit `.env.example` files (NOT `.env` with secrets!)

### 2. MongoDB Atlas Setup
- [ ] Login to MongoDB Atlas
- [ ] Go to Network Access
- [ ] Add IP: `0.0.0.0/0` (Allow from anywhere)
- [ ] Verify all database URIs are working

### 3. Cloudinary Setup
- [ ] Verify Cloudinary credentials
- [ ] Test image upload (optional)

### 4. Razorpay Setup
- [ ] Get Razorpay test/live keys
- [ ] Note down Key ID, Secret, and Webhook Secret

---

## Deployment Steps

### Phase 1: Deploy Internal Services (1-8)

#### Service 1: Auth Service ✅
- [ ] Create new Web Service on Render
- [ ] Name: `outfitgo-auth-service`
- [ ] Root Directory: `backend/auth-service`
- [ ] Add environment variables (see RENDER_DEPLOYMENT.md)
- [ ] Deploy and wait for success
- [ ] Copy service URL: `_______________________________`
- [ ] Test: `curl https://your-url.onrender.com/health`

#### Service 2: Product Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-product-service`
- [ ] Root Directory: `backend/product-service`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`
- [ ] Test health endpoint

#### Service 3: Cart Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-cart-service`
- [ ] Root Directory: `backend/cart-service`
- [ ] Add environment variables (include PRODUCT_SERVICE_URL)
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

#### Service 4: Order Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-order-service`
- [ ] Root Directory: `backend/order-service`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

#### Service 5: Payment Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-payment-service`
- [ ] Root Directory: `backend/payment-service`
- [ ] Add Razorpay credentials
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

#### Service 6: Live Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-live-service`
- [ ] Root Directory: `backend/live-service`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

#### Service 7: Wishlist Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-wishlist-service`
- [ ] Root Directory: `backend/wishlist-service`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

#### Service 8: User Service ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-user-service`
- [ ] Root Directory: `backend/user-service`
- [ ] Add environment variables
- [ ] Deploy
- [ ] Copy service URL: `_______________________________`

---

### Phase 2: Deploy API Gateway (Last!)

#### Service 9: API Gateway ✅
- [ ] Create new Web Service
- [ ] Name: `outfitgo-api-gateway`
- [ ] Root Directory: `backend/api-gateway`
- [ ] Start Command: `node src/server.production.js`
- [ ] Add ALL service URLs from above
- [ ] Deploy
- [ ] Copy MAIN API URL: `_______________________________`
- [ ] Test: `curl https://your-gateway-url.onrender.com/health`

---

## Post-Deployment Testing

### 1. Health Checks
```bash
# API Gateway
curl https://outfitgo-api-gateway.onrender.com/health

# Auth via Gateway
curl https://outfitgo-api-gateway.onrender.com/api/auth/health

# Products via Gateway
curl https://outfitgo-api-gateway.onrender.com/api/products/health
```

### 2. Seed Super Admin
- [ ] Go to Render Dashboard → Auth Service
- [ ] Click "Shell" tab
- [ ] Run: `npm run seed`
- [ ] Verify super admin created

### 3. Test Login
```bash
curl -X POST https://outfitgo-api-gateway.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@outfitgo.com","password":"Admin123!"}'
```
- [ ] Should return JWT token

### 4. Test Products Endpoint
```bash
curl https://outfitgo-api-gateway.onrender.com/api/products
```
- [ ] Should return products array (may be empty initially)

---

## Service URLs Reference

Fill in your actual URLs after deployment:

```
Auth Service:     https://outfitgo-auth-service.onrender.com
Product Service:  https://outfitgo-product-service.onrender.com
Cart Service:     https://outfitgo-cart-service.onrender.com
Order Service:    https://outfitgo-order-service.onrender.com
Payment Service:  https://outfitgo-payment-service.onrender.com
Live Service:     https://outfitgo-live-service.onrender.com
Wishlist Service: https://outfitgo-wishlist-service.onrender.com
User Service:     https://outfitgo-user-service.onrender.com

🌟 API GATEWAY (MAIN): https://outfitgo-api-gateway.onrender.com
```

---

## Frontend Deployment

### Admin Panel (Vercel/Netlify)
- [ ] Update `.env` with API Gateway URL:
  ```
  VITE_API_URL=https://outfitgo-api-gateway.onrender.com
  ```
- [ ] Deploy to Vercel/Netlify
- [ ] Copy admin panel URL: `_______________________________`
- [ ] Update CORS_ORIGINS in API Gateway with admin panel URL
- [ ] Redeploy API Gateway

### Mobile App (Expo)
- [ ] Update API URL in app config
- [ ] Build with Expo EAS
- [ ] Test on device

---

## Troubleshooting

### Service Won't Start
- [ ] Check logs in Render dashboard
- [ ] Verify environment variables
- [ ] Check MongoDB network access (0.0.0.0/0)

### 502 Bad Gateway
- [ ] Wait 30-50 seconds (cold start on free tier)
- [ ] Check if service is sleeping
- [ ] Verify service URL is correct

### CORS Errors
- [ ] Update CORS_ORIGINS in API Gateway
- [ ] Include your frontend URLs
- [ ] Redeploy API Gateway

### Authentication Errors
- [ ] Verify JWT_SECRET is same across all services
- [ ] Run seed script in auth-service
- [ ] Check super admin credentials

---

## Cost Summary

### Free Tier (All services free)
- **Cost:** $0/month
- **Limitation:** Services sleep after 15 min inactivity
- **Cold start:** 30-50 seconds on first request

### Recommended (Gateway + Auth paid)
- **Cost:** $14/month
- **Benefits:** Main services always active
- **Other services:** Can sleep (wake up when needed)

### Full Production (All paid)
- **Cost:** $63/month ($7 × 9 services)
- **Benefits:** No cold starts, best performance

---

## Next Steps After Deployment

1. [ ] Deploy admin panel
2. [ ] Update admin panel API URL
3. [ ] Test admin login and features
4. [ ] Deploy mobile app
5. [ ] Update mobile app API URL
6. [ ] Test complete user flow
7. [ ] Add products via admin panel
8. [ ] Test orders and payments
9. [ ] Monitor logs for errors
10. [ ] Set up custom domain (optional)

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Cloudinary:** https://cloudinary.com/console
- **Razorpay:** https://dashboard.razorpay.com

---

## Important Notes

⚠️ **Security:**
- Never commit `.env` files with real credentials
- Change JWT_SECRET in production
- Use strong passwords
- Enable 2FA on all services

⚠️ **MongoDB Atlas:**
- Must allow IP `0.0.0.0/0` for Render services
- Each service connects to separate database

⚠️ **Free Tier:**
- Services sleep after 15 minutes
- First request wakes them up (slow)
- Consider paid tier for better UX

✅ **Success Indicators:**
- All health checks return 200 OK
- Login returns JWT token
- Products endpoint returns data
- No errors in logs
