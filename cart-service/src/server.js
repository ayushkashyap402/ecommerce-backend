require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const cartRoutes = require('./routes/cartRoutes');

const app = express();

app.use(helmet());

// Note: CORS is handled by API Gateway);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cart-service' });
});

app.use('/', cartRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error'
  });
});

const port = process.env.PORT || 4003;

connectDb()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[cart-service] listening on port ${port}`);
    });
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('[cart-service] failed to connect to db', err);
    process.exit(1);
  });

