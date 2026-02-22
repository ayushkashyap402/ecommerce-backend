const mongoose = require('mongoose');

const connectDb = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined for auth-service');
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000
    });
  } catch (err) {
    if (err.code === 8000 || err.codeName === 'AtlasError') {
      // eslint-disable-next-line no-console
      console.error(
        '[auth-service] MongoDB auth failed. In Atlas: Database Access → check user exists, reset password (use only letters/numbers), then update MONGO_URI in .env. Ensure Network Access allows your IP.'
      );
    }
    throw err;
  }

  // Basic connection logging
  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[auth-service] MongoDB connected');
  });

  mongoose.connection.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[auth-service] MongoDB connection error', err);
  });
};

module.exports = { connectDb };

