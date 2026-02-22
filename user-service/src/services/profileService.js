const UserProfile = require('../models/UserProfile');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

const getOrCreateProfile = async (userId, userData) => {
  let profile = await UserProfile.findOne({ userId });
  
  if (!profile) {
    profile = await UserProfile.create({
      userId,
      name: userData.name || 'User',
      email: userData.email || ''
    });
  }
  
  return profile;
};

const updateProfile = async (userId, updates) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: updates, updatedAt: Date.now() },
    { new: true, upsert: true }
  );
  
  return profile;
};

const uploadAvatar = async (userId, file) => {
  try {
    // Get existing profile
    const profile = await UserProfile.findOne({ userId });
    
    // Delete old avatar if exists
    if (profile?.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(profile.avatarPublicId);
      } catch (error) {
        console.error('Error deleting old avatar:', error);
      }
    }
    
    // Upload new avatar
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'OutfitGo/profile/user',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
    
    // Delete temp file
    try {
      await fs.unlink(file.path);
    } catch (error) {
      console.error('Error deleting temp file:', error);
    }
    
    // Update profile
    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId },
      {
        avatar: result.secure_url,
        avatarPublicId: result.public_id,
        updatedAt: Date.now()
      },
      { new: true, upsert: true }
    );
    
    return updatedProfile;
  } catch (error) {
    // Clean up temp file on error
    if (file?.path) {
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    throw error;
  }
};

const deleteAvatar = async (userId) => {
  const profile = await UserProfile.findOne({ userId });
  
  if (profile?.avatarPublicId) {
    await cloudinary.uploader.destroy(profile.avatarPublicId);
  }
  
  const updatedProfile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      avatar: null,
      avatarPublicId: null,
      updatedAt: Date.now()
    },
    { new: true }
  );
  
  return updatedProfile;
};

const deleteProfile = async (userId) => {
  const profile = await UserProfile.findOne({ userId });
  
  // Delete avatar from Cloudinary
  if (profile?.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(profile.avatarPublicId);
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  }
  
  await UserProfile.deleteOne({ userId });
};

const updateStats = async (userId, stats) => {
  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { stats, updatedAt: Date.now() } },
    { new: true }
  );
  
  return profile;
};

module.exports = {
  getOrCreateProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  deleteProfile,
  updateStats
};
