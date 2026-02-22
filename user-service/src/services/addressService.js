const Address = require('../models/Address');

const getAddresses = async (userId, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const [addresses, total] = await Promise.all([
    Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Address.countDocuments({ userId })
  ]);
  
  return {
    addresses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getAddressById = async (userId, addressId) => {
  return await Address.findOne({ _id: addressId, userId });
};

const createAddress = async (userId, addressData) => {
  // Check address limit (max 10 per user)
  const addressCount = await Address.countDocuments({ userId });
  
  if (addressCount >= 10) {
    throw new Error('Maximum address limit reached (10 addresses per user)');
  }
  
  const address = await Address.create({
    userId,
    ...addressData
  });
  
  return address;
};

const updateAddress = async (userId, addressId, updates) => {
  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: updates, updatedAt: Date.now() },
    { new: true }
  );
  
  if (!address) {
    throw new Error('Address not found');
  }
  
  return address;
};

const deleteAddress = async (userId, addressId) => {
  const result = await Address.deleteOne({ _id: addressId, userId });
  
  if (result.deletedCount === 0) {
    throw new Error('Address not found');
  }
  
  return result;
};

const setDefaultAddress = async (userId, addressId) => {
  // First check if address exists
  const address = await Address.findOne({ _id: addressId, userId });
  
  if (!address) {
    throw new Error('Address not found');
  }
  
  // Remove default from all addresses
  await Address.updateMany(
    { userId },
    { isDefault: false }
  );
  
  // Set new default
  const updatedAddress = await Address.findOneAndUpdate(
    { _id: addressId, userId },
    { isDefault: true, updatedAt: Date.now() },
    { new: true }
  );
  
  return updatedAddress;
};

const getDefaultAddress = async (userId) => {
  return await Address.findOne({ userId, isDefault: true });
};

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
};
