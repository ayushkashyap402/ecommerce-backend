const mongoose = require('mongoose');

// Create a separate connection for auth database
const authDbUri = process.env.AUTH_DB_URI || process.env.MONGO_URI;

console.log('🔗 [SuperAdmin Model] Connecting to auth database');

const authConnection = mongoose.createConnection(authDbUri);

authConnection.on('connected', () => {
  console.log('✅ [SuperAdmin Model] Connected to auth database');
});

authConnection.on('error', (err) => {
  console.error('❌ [SuperAdmin Model] Auth database connection error:', err);
});

// SuperAdmin model - connects to auth database collection
const superAdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, {
  collection: 'super-admin' // Note: collection name has hyphen
});

module.exports = authConnection.model('SuperAdmin', superAdminSchema, 'super-admin');
