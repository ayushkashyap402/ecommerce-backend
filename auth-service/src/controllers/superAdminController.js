const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Get all users with activity stats
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get user by ID with full details
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * Update user status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isActive = isActive;
    await user.save();
    
    res.json({
      message: 'User status updated',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.deleteOne();
    
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * Get all admins with stats
 */
const getAllAdmins = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    
    const [admins, total] = await Promise.all([
      Admin.find(query)
        .populate('createdBy', 'name email')
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Admin.countDocuments(query)
    ]);
    
    // Transform for frontend
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
    
    res.json({
      admins: transformedAdmins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get admin by ID
 */
const getAdminById = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    
    const admin = await Admin.findById(adminId)
      .populate('createdBy', 'name email')
      .select('-passwordHash');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role || 'admin',
      permissions: admin.permissions,
      status: admin.isActive ? 'active' : 'inactive',
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      createdBy: admin.createdBy
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get platform statistics
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalAdmins, activeAdmins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Admin.countDocuments(),
      Admin.countDocuments({ isActive: true })
    ]);
    
    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      admins: {
        total: totalAdmins,
        active: activeAdmins,
        inactive: totalAdmins - activeAdmins
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllAdmins,
  getAdminById,
  getPlatformStats
};
