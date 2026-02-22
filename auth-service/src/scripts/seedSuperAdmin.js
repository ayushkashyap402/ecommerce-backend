require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');

const seedSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.AUTH_MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
      console.log('❌ Super admin credentials not found in environment variables');
      return;
    }

    // Check if super admin already exists
    let superAdmin = await SuperAdmin.findOne({ email: superAdminEmail });

    if (!superAdmin) {
      console.log('🌱 Creating super admin user...');
      const passwordHash = await bcrypt.hash(superAdminPassword, 10);
      
      superAdmin = await SuperAdmin.create({
        name: 'Super Admin',
        email: superAdminEmail,
        passwordHash,
        role: 'superadmin',
        isActive: true,
        permissions: ['all'], // Full permissions
        createdAt: new Date(),
        lastLogin: null
      });

      console.log('✅ Super admin created successfully');
      console.log(`📧 Email: ${superAdminEmail}`);
      console.log(`🔑 Password: ${superAdminPassword}`);
    } else {
      console.log('✅ Super admin already exists in database');
      
      // Update password if it has changed
      const passwordMatch = await bcrypt.compare(superAdminPassword, superAdmin.passwordHash);
      if (!passwordMatch) {
        console.log('🔄 Updating super admin password...');
        const newPasswordHash = await bcrypt.hash(superAdminPassword, 10);
        superAdmin.passwordHash = newPasswordHash;
        await superAdmin.save();
        console.log('✅ Super admin password updated');
      }
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
    process.exit(1);
  }
};

// Run the seeding
seedSuperAdmin();
