require('dotenv').config();
const { connectDb } = require('../config/db');
const Admin = require('../models/Admin');

const defaultPermissions = ['manage_products', 'manage_orders', 'view_analytics'];

async function addPermissionsToAdmins() {
  try {
    await connectDb();
    console.log('✅ Connected to database');

    // Find all admins without permissions or with empty permissions
    const admins = await Admin.find({
      $or: [
        { permissions: { $exists: false } },
        { permissions: { $size: 0 } }
      ]
    });

    console.log(`📋 Found ${admins.length} admins without permissions`);

    if (admins.length === 0) {
      console.log('✅ All admins already have permissions');
      process.exit(0);
    }

    // Update each admin
    for (const admin of admins) {
      admin.permissions = defaultPermissions;
      await admin.save();
      console.log(`✅ Updated permissions for: ${admin.email}`);
    }

    console.log(`\n✅ Successfully updated ${admins.length} admins`);
    console.log('Default permissions added:', defaultPermissions);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPermissionsToAdmins();
