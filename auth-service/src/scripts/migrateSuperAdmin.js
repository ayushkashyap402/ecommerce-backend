require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const User = require('../models/User');

const migrateSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if Super Admin already exists in super-admin collection
    const existingSuperAdmin = await SuperAdmin.findOne();
    if (existingSuperAdmin) {
      console.log('Super Admin already exists in super-admin collection');
      return;
    }

    // Get Super Admin from users collection
    const superAdminFromUsers = await User.findOne({ email: process.env['SUPER-ADMIN-EMAIL'] });
    
    if (superAdminFromUsers) {
      console.log('Found Super Admin in users collection, migrating...');
      
      // Create Super Admin in correct collection
      const superAdmin = new SuperAdmin({
        name: superAdminFromUsers.name,
        email: superAdminFromUsers.email,
        passwordHash: superAdminFromUsers.passwordHash,
        isActive: true,
        lastLogin: superAdminFromUsers.lastLogin
      });

      await superAdmin.save();
      console.log('Super Admin migrated to super-admin collection');

      // Remove from users collection
      await User.deleteOne({ email: process.env['SUPER-ADMIN-EMAIL'] });
      console.log('Super Admin removed from users collection');
    } else {
      // Create new Super Admin from environment variables
      console.log('Creating new Super Admin from environment variables...');
      const passwordHash = await bcrypt.hash(process.env['SUPER-ADMIN-PASSWORD'], 10);
      
      const superAdmin = new SuperAdmin({
        name: 'Super Admin',
        email: process.env['SUPER-ADMIN-EMAIL'],
        passwordHash,
        isActive: true
      });

      await superAdmin.save();
      console.log('Super Admin created in super-admin collection');
    }

    // Also migrate any admins from users collection to admins collection
    const adminsFromUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    
    for (const adminUser of adminsFromUsers) {
      if (adminUser.email !== process.env['SUPER-ADMIN-EMAIL']) {
        console.log(`Migrating admin: ${adminUser.email}`);
        
        const admin = new Admin({
          name: adminUser.name,
          email: adminUser.email,
          passwordHash: adminUser.passwordHash,
          permissions: adminUser.permissions || [],
          isActive: adminUser.isActive !== false,
          lastLogin: adminUser.lastLogin,
          createdBy: null // Will be set when Super Admin creates them
        });

        await admin.save();
        await User.deleteOne({ _id: adminUser._id });
        console.log(`Admin ${adminUser.email} migrated to admins collection`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

migrateSuperAdmin();
