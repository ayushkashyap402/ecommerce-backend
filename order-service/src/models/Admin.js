const mongoose = require('mongoose');

// Create a separate connection for auth database
const authDbUri = process.env.AUTH_DB_URI || process.env.MONGO_URI;

console.log('🔗 [Admin Model] Connecting to auth database');

const authConnection = mongoose.createConnection(authDbUri);

authConnection.on('connected', () => {
  console.log('✅ [Admin Model] Connected to auth database');
});

authConnection.on('error', (err) => {
  console.error('❌ [Admin Model] Auth database connection error:', err);
});

// Admin model - connects to auth database collection
const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, {
  collection: 'admins'
});

module.exports = authConnection.model('Admin', adminSchema);
