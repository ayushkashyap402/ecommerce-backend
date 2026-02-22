require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const productRoutes = require('./routes/productRoutes');

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

// Increase body size limit for image uploads (base64 images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.use('/', productRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    data: null
  });
});

const port = process.env.PORT || 4002;

connectDb()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[product-service] listening on port ${port}`);
    });
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('[product-service] failed to connect to db', err);
    process.exit(1);
  });


