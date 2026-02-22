const addressService = require('../services/addressService');

// Get all addresses
const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await addressService.getAddresses(userId, { page, limit });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get single address
const getAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { addressId } = req.params;
    
    const address = await addressService.getAddressById(userId, addressId);
    
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    res.json({ address });
  } catch (error) {
    next(error);
  }
};

// Create new address
const createAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const addressData = req.body;
    
    const address = await addressService.createAddress(userId, addressData);
    
    res.status(201).json({
      message: 'Address created successfully',
      address
    });
  } catch (error) {
    if (error.message === 'Maximum address limit reached (10 addresses per user)') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// Update address
const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { addressId } = req.params;
    const updates = req.body;
    
    const address = await addressService.updateAddress(userId, addressId, updates);
    
    res.json({
      message: 'Address updated successfully',
      address
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// Delete address
const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { addressId } = req.params;
    
    await addressService.deleteAddress(userId, addressId);
    
    res.json({
      message: 'Address deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// Set default address
const setDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { addressId } = req.params;
    
    const address = await addressService.setDefaultAddress(userId, addressId);
    
    res.json({
      message: 'Default address updated successfully',
      address
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// Get default address
const getDefaultAddress = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.id;
    const address = await addressService.getDefaultAddress(userId);
    
    if (!address) {
      return res.status(404).json({ message: 'No default address found' });
    }
    
    res.json({ address });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
};
