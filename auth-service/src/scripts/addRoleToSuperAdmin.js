require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');

const addRoleField = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI ? 'Found in .env' : 'Using default');
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auth-db', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB');

    // Update SuperAdmin document to add role field
    const superAdminResult = await mongoose.connection.db.collection('super-admin').updateMany(
      { role: { $exists: false } },
      { $set: { role: 'superadmin' } }
    );

    console.log(`Updated ${superAdminResult.modifiedCount} SuperAdmin document(s) with role field`);

    // Update Admin documents to add role field
    const adminResult = await mongoose.connection.db.collection('admins').updateMany(
      { role: { $exists: false } },
      { $set: { role: 'admin' } }
    );

    console.log(`Updated ${adminResult.modifiedCount} Admin document(s) with role field`);

    // Verify the update
    const superAdmin = await SuperAdmin.findOne();
    if (superAdmin) {
      console.log('\nSuperAdmin document after update:');
      console.log({
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        permissions: superAdmin.permissions,
        isActive: superAdmin.isActive
      });
    }

    const admins = await Admin.find();
    if (admins.length > 0) {
      console.log('\nAdmin documents after update:');
      admins.forEach(admin => {
        console.log({
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        });
      });
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addRoleField();
