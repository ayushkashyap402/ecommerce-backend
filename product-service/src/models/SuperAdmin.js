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

const superAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['superadmin'],
      default: 'superadmin',
      immutable: true
    },
    permissions: {
      type: [String],
      default: ['*']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = authConnection.model('SuperAdmin', superAdminSchema, 'super-admin');
