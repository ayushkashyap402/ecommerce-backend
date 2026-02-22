require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const wishlistRoutes = require('./routes/wishlistRoutes');

const app = express();

app.use(helmet());

const allowedOrigins = (
  process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080'
)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like from API Gateway or mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all in development
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wishlist-service' });
});

app.use('/', wishlistRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error'
  });
});

const port = process.env.PORT || 4007;

connectDb()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[wishlist-service] listening on port ${port}`);
    });
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('[wishlist-service] failed to connect to db', err);
    process.exit(1);
  });
