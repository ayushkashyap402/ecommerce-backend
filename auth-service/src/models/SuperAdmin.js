const mongoose = require('mongoose');

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
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: 'superadmin',
      enum: ['superadmin']
    },
    permissions: {
      type: [String],
      default: [
        'manage_admins',
        'manage_products',
        'manage_orders',
        'manage_users',
        'manage_cart',
        'manage_live_service',
        'system_settings',
        'analytics',
        'full_access'
      ]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one superadmin can exist
superAdminSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingSuperAdmin = await this.constructor.findOne();
    if (existingSuperAdmin) {
      const error = new Error('Only one Super Admin can exist');
      error.code = 'SUPERADMIN_EXISTS';
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema, 'super-admin');
