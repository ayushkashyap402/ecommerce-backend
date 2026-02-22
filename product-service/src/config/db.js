const mongoose = require('mongoose');

const connectDb = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined for product-service');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[product-service] MongoDB connected');
  });

  mongoose.connection.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[product-service] MongoDB connection error', err);
  });
};

module.exports = { connectDb };

