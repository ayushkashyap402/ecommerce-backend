const express = require('express');
const { authenticate } = require('../middleware/auth');
const addressController = require('../controllers/addressController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get default address (must be before /:addressId)
router.get('/default/address', addressController.getDefaultAddress);

// Get all addresses
router.get('/', addressController.getAddresses);

// Get single address
router.get('/:addressId', addressController.getAddress);

// Create new address
router.post('/', addressController.createAddress);

// Update address
router.put('/:addressId', addressController.updateAddress);

// Delete address
router.delete('/:addressId', addressController.deleteAddress);

// Set default address
router.put('/:addressId/default', addressController.setDefaultAddress);

module.exports = router;
