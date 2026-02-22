const mongoose = require('mongoose');

const connectDb = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined for cart-service');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[cart-service] MongoDB connected');
  });

  mongoose.connection.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[cart-service] MongoDB connection error', err);
  });
};

module.exports = { connectDb };

