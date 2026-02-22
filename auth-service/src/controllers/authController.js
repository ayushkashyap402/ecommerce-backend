const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

const handleValidation = req => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.details = errors.array();
    throw error;
  }
};

const register = async (req, res, next) => {
  try {
    handleValidation(req);
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });

    res.status(201).json({
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        permissions: result.user.permissions
      }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    handleValidation(req);
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.json({
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        permissions: result.user.permissions
      }
    });
  } catch (err) {
    next(err);
  }
};

const listAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find()
      .populate('createdBy', 'name email')
      .select('name email role permissions isActive lastLogin createdAt createdBy')
      .sort({ createdAt: -1 });
    
    // Transform isActive to status for frontend
    const transformedAdmins = admins.map(admin => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role || 'admin',
      permissions: admin.permissions,
      status: admin.isActive ? 'active' : 'inactive',
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      createdBy: admin.createdBy
    }));
    
    res.json(transformedAdmins);
  } catch (err) {
    next(err);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    handleValidation(req);
    const { name, email, password, permissions = [], status } = req.body;

    // SECURITY: This endpoint ONLY creates regular Admins, never SuperAdmin
    // SuperAdmin is created via:
    // 1. Environment variables (SUPER_ADMIN_EMAIL/PASSWORD)
    // 2. Seed script (npm run seed)
    // There is NO API endpoint to create SuperAdmin
    
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Creates Admin document (NOT SuperAdmin)
    const admin = await Admin.create({
      name,
      email,
      passwordHash,
      permissions,
      isActive: status === 'active' || status === undefined,
      createdBy: req.user.sub // Super Admin ID who created this admin
    });

    // Populate createdBy field for response
    await admin.populate('createdBy', 'name email');

    res.status(201).json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin', // Always 'admin', never 'superadmin'
      permissions: admin.permissions,
      status: admin.isActive ? 'active' : 'inactive',
      createdBy: admin.createdBy,
      createdAt: admin.createdAt
    });
  } catch (err) {
    if (err.code === 'SUPERADMIN_EXISTS') {
      return res.status(403).json({ message: err.message });
    }
    next(err);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent deletion of Super Admin
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Super Admin cannot be deleted' });
    }

    await admin.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
    handleValidation(req);
    const { id } = req.params;
    const { name, email, password, permissions, status } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Prevent updating Super Admin
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Super Admin cannot be updated via this endpoint' });
    }

    // Update fields
    if (name) admin.name = name;
    if (email && email !== admin.email) {
      const existing = await Admin.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      admin.email = email;
    }
    if (password) {
      admin.passwordHash = await bcrypt.hash(password, 10);
    }
    if (permissions !== undefined) {
      admin.permissions = permissions;
    }
    if (status !== undefined) {
      admin.isActive = status === 'active';
    }

    await admin.save();
    await admin.populate('createdBy', 'name email');

    res.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      permissions: admin.permissions,
      status: admin.isActive ? 'active' : 'inactive',
      createdBy: admin.createdBy,
      createdAt: admin.createdAt
    });
  } catch (err) {
    next(err);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    handleValidation(req);
    const { email, password } = req.body;

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    // Handle super admin login based on .env credentials
    if (superAdminEmail && superAdminPassword && email === superAdminEmail) {
      let superAdmin = await SuperAdmin.findOne({ email: superAdminEmail });

      // Bootstrap super admin user if missing
      if (!superAdmin) {
        const passwordHash = await bcrypt.hash(superAdminPassword, 10);
        superAdmin = await SuperAdmin.create({
          name: 'Super Admin',
          email: superAdminEmail,
          passwordHash
        });
      }

      // Compare hashed password
      const passwordMatch = await bcrypt.compare(password, superAdmin.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      superAdmin.lastLogin = new Date();
      await superAdmin.save();

      const payload = {
        sub: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      });

      return res.json({
        token,
        user: {
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: 'superadmin',
          permissions: superAdmin.permissions
        }
      });
    }

    // Fallback for regular admin users stored in Admin collection
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const payload = {
      sub: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      permissions: admin.permissions || ['manage_products', 'manage_orders', 'view_analytics'] // Add default permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        permissions: admin.permissions
      }
    });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a super admin
    if (decoded.role === 'superadmin') {
      const superAdmin = await SuperAdmin.findById(decoded.sub).select(
        'name email permissions isActive lastLogin'
      );

      if (!superAdmin) {
        return res.status(404).json({ message: 'Super Admin not found' });
      }

      return res.json({
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin',
        permissions: superAdmin.permissions,
        isActive: superAdmin.isActive,
        lastLogin: superAdmin.lastLogin
      });
    }

    // Check if it's a regular admin
    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.sub).select(
        'name email permissions isActive lastLogin createdBy'
      ).populate('createdBy', 'name email');

      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      return res.json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        permissions: admin.permissions,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdBy: admin.createdBy
      });
    }

    // Regular user
    const user = await User.findById(decoded.sub).select(
      'name email phone avatar addresses isActive emailVerified phoneVerified'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      addresses: user.addresses,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      role: 'user'
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, email } = req.body;

    if (decoded.role === 'superadmin') {
      const superAdmin = await SuperAdmin.findById(decoded.sub);
      if (!superAdmin) {
        return res.status(404).json({ message: 'Super Admin not found' });
      }
      
      if (name) superAdmin.name = name;
      if (email && email !== superAdmin.email) {
        const existing = await SuperAdmin.findOne({ email });
        if (existing) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        superAdmin.email = email;
      }
      
      await superAdmin.save();
      
      return res.json({
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin'
      });
    }

    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.sub);
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      
      if (name) admin.name = name;
      if (email && email !== admin.email) {
        const existing = await Admin.findOne({ email });
        if (existing) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        admin.email = email;
      }
      
      await admin.save();
      
      return res.json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      });
    }

    // Regular user
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (name) user.name = name;
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    await user.save();
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'user'
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, just return success
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate reset token and send email (implementation needed)
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify reset token and update password (implementation needed)
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    // Verify email token (implementation needed)
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  me,
  adminLogin,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail
};



// Get admin profile by ID
const getAdminProfile = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId).select('-passwordHash');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      followers: admin.followers || 0,
      bio: admin.bio || '',
      avatar: admin.avatar || '',
      isActive: admin.isActive,
      createdAt: admin.createdAt
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  superAdminLogin,
  getAdminProfile
};
