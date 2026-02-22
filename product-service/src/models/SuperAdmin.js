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

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
