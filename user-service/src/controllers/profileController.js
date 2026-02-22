const profileService = require('../services/profileService');

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const profile = await profileService.getOrCreateProfile(userId, {
      name: req.user.name,
      email: req.user.email
    });
    
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { name, phone, dateOfBirth, gender } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
    if (gender) updates.gender = gender;
    
    const profile = await profileService.updateProfile(userId, updates);
    
    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Upload avatar
const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const profile = await profileService.uploadAvatar(userId, req.file);
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatar: profile.avatar,
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Delete avatar
const deleteAvatar = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const profile = await profileService.deleteAvatar(userId);
    
    res.json({
      message: 'Avatar deleted successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Update preferences
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { preferences } = req.body;
    
    const profile = await profileService.updateProfile(userId, { preferences });
    
    res.json({
      message: 'Preferences updated successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Get user stats
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const profile = await profileService.getOrCreateProfile(userId, {
      name: req.user.name,
      email: req.user.email
    });
    
    res.json({
      stats: profile.stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  updatePreferences,
  getStats
};
