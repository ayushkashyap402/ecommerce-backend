const cloudinary = require('../config/cloudinary');

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} folder - Cloudinary folder name (default: 'OutfitGo/live')
 * @returns {Promise<Object>} - Cloudinary upload response
 */
const uploadImage = async (base64Image, folder = 'OutfitGo/live') => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' }, // Max dimensions for live thumbnails
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Cloudinary delete response
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Upload video thumbnail
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Upload result
 */
const uploadThumbnail = async (base64Image) => {
  return uploadImage(base64Image, 'OutfitGo/live/thumbnails');
};

/**
 * Upload streamer profile image
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Upload result
 */
const uploadProfileImage = async (base64Image) => {
  return uploadImage(base64Image, 'OutfitGo/live/profiles');
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadThumbnail,
  uploadProfileImage,
};
