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

const adminSchema = new mongoose.Schema(
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
      enum: ['admin', 'superadmin'],
      default: 'admin'
    },
    permissions: {
      type: [String],
      default: ['manage_products', 'manage_orders', 'view_analytics']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin'
    }
  },
  { timestamps: true }
);

module.exports = authConnection.model('Admin', adminSchema);
