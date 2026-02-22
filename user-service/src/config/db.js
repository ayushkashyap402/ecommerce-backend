const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[user-service] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[user-service] MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDb };
