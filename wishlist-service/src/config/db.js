const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`[wishlist-service] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[wishlist-service] MongoDB connection error:`, err);
    throw err;
  }
};

module.exports = { connectDb };
