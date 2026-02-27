const cloudinary = require('../config/cloudinary');

/**
 * Get Cloudinary folder path based on seller name and SKU
 * @param {string} category - Product category
 * @param {string} sku - Product SKU code
 * @param {string} sellerName - Seller/Admin name
 * @returns {string} - Cloudinary folder path
 */
const getCategoryFolder = (category, sku = null, sellerName = null) => {
  if (!category) {
    return 'OutfitGo/products/uncategorized';
  }
  
  // Normalize category name
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '');
  
  // If seller name and SKU are provided, create seller/SKU-based folder structure
  if (sellerName && sku) {
    // Normalize seller name (remove spaces, special chars)
    const normalizedSeller = sellerName.replace(/[^a-zA-Z0-9]/g, '_');
    return `OutfitGo/products/${normalizedSeller}/${sku}`;
  }
  
  // If only SKU is provided (fallback)
  if (sku) {
    return `OutfitGo/products/${normalizedCategory}/${sku}`;
  }
  
  // Fallback to category-only folder
  const folderMap = {
    'menswear': 'OutfitGo/products/menswear',
    'womenwear': 'OutfitGo/products/womenwear',
    'womenswear': 'OutfitGo/products/womenwear',
    'kidswear': 'OutfitGo/products/kidswear',
    'winterwear': 'OutfitGo/products/winterwear',
    'summerwear': 'OutfitGo/products/summerwear',
    'footwear': 'OutfitGo/products/footwear',
  };
  
  return folderMap[normalizedCategory] || `OutfitGo/products/${normalizedCategory}`;
};

/**
 * Upload image to Cloudinary with seller name and SKU-based folder
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} category - Product category for folder organization
 * @param {string} sku - Product SKU code for folder organization
 * @param {string} sellerName - Seller/Admin name for folder organization
 * @returns {Promise<Object>} - Cloudinary upload response
 */
const uploadImage = async (base64Image, category = null, sku = null, sellerName = null) => {
  try {
    const folder = getCategoryFolder(category, sku, sellerName);
    
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Max dimensions
        { quality: 'auto:good' }, // Auto quality optimization
        { fetch_format: 'auto' }, // Auto format (WebP when supported)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      folder: folder,
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
 * Upload multiple images to Cloudinary with seller name and SKU-based folder
 * @param {Array<string>} base64Images - Array of base64 encoded images
 * @param {string} category - Product category for folder organization
 * @param {string} sku - Product SKU code for folder organization
 * @param {string} sellerName - Seller/Admin name for folder organization
 * @returns {Promise<Array<Object>>} - Array of upload results
 */
const uploadMultipleImages = async (base64Images, category = null, sku = null, sellerName = null) => {
  try {
    const uploadPromises = base64Images.map((image) => uploadImage(image, category, sku, sellerName));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple images upload error:', error);
    throw new Error('Failed to upload multiple images');
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array<Object>>} - Array of delete results
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Multiple images delete error:', error);
    throw new Error('Failed to delete multiple images');
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadMultipleImages,
  deleteMultipleImages,
  getCategoryFolder,
};
