const productService = require('../services/productService');
const { productEvents } = require('../events/productEvents');
const jwt = require('jsonwebtoken');
const { uploadImage, deleteImage, uploadMultipleImages } = require('../utils/imageUpload');

const list = async (req, res, next) => {
  try {
    let role;
    let userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        userId = decoded.sub;
        
        // DEBUG: Log extracted values
        console.log('🔍 [Product List] Decoded JWT:', { role, userId, email: decoded.email });
      } catch (err) {
        console.log('⚠️  [Product List] Invalid token:', err.message);
        // Ignore invalid tokens for public listing; treat as unauthenticated
      }
    } else {
      console.log('⚠️  [Product List] No authorization header found');
    }

    // Check if SuperAdmin is viewing a specific admin's products
    const viewAsAdminId = req.query.viewAsAdminId;
    const category = req.query.category;
    
    console.log('🔍 [Product List] Calling service with:', { role, userId, viewAsAdminId, category });

    const products = await productService.listProducts({ 
      role, 
      userId, 
      category,
      viewAsAdminId: role === 'superadmin' ? viewAsAdminId : null 
    });
    
    console.log(`✅ [Product List] Returning ${products.length} products`);
    res.json(products);
  } catch (err) {
    console.error('❌ [Product List] Error:', err);
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    console.log('🔍 [Product getById] Fetching product:', req.params.id);
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      console.log('❌ [Product getById] Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('✅ [Product getById] Product found:', product.name);
    res.json(product);
  } catch (err) {
    console.error('❌ [Product getById] Error:', err);
    next(err);
  }
};

const addReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment, userId, userName } = req.body;

    if (!rating || !comment || !userId || !userName) {
      return res.status(400).json({ message: 'Rating, comment, userId, and userName are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const product = await productService.addReview(productId, { rating, comment, userId, userName });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('❌ [Add Review] Error:', err);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    // Extract user info from JWT
    const authHeader = req.headers.authorization;
    let creatorName = 'Unknown';
    let creatorRole = 'admin';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        creatorName = decoded.email ? decoded.email.split('@')[0] : 'Unknown';
        creatorRole = decoded.role || 'admin';
        
        // If name is in token, use it
        if (decoded.name) {
          creatorName = decoded.name;
        }
      } catch (err) {
        console.log('⚠️  Could not decode token for creator info');
      }
    }
    
    const payload = {
      ...req.body,
      createdBy: req.user?.sub,
      createdByName: creatorName,
      createdByRole: creatorRole
    };

    // Handle image upload if images are provided
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      try {
        // Pass category to upload images to correct folder
        const uploadedImages = await uploadMultipleImages(req.body.images, req.body.category);
        payload.images = uploadedImages.map(img => img.url);
        payload.thumbnailUrl = uploadedImages[0]?.url; // First image as thumbnail
        
        // Store publicIds for future deletion (optional)
        payload.imagePublicIds = uploadedImages.map(img => img.publicId);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ 
          message: 'Failed to upload images',
          error: uploadError.message 
        });
      }
    }

    const product = await productService.createProduct(payload);
    
    // No need to manually notify - Change Stream will handle it automatically
    
    res.status(201).json(product);
    productEvents.emit('changed', { type: 'create', id: product.id });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Handle new image uploads if provided
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      // Check if images are base64 (new uploads) or URLs (existing)
      const newImages = req.body.images.filter(img => img.startsWith('data:'));
      
      if (newImages.length > 0) {
        try {
          // Pass category to upload images to correct folder
          const category = req.body.category || updateData.category;
          const uploadedImages = await uploadMultipleImages(newImages, category);
          const existingImages = req.body.images.filter(img => !img.startsWith('data:'));
          
          updateData.images = [...existingImages, ...uploadedImages.map(img => img.url)];
          updateData.thumbnailUrl = updateData.images[0]; // First image as thumbnail
          
          // Update publicIds
          const newPublicIds = uploadedImages.map(img => img.publicId);
          updateData.imagePublicIds = [...(updateData.imagePublicIds || []), ...newPublicIds];
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          return res.status(400).json({ 
            message: 'Failed to upload images',
            error: uploadError.message 
          });
        }
      }
    }

    const product = await productService.updateProduct(req.params.id, updateData);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // No need to manually notify - Change Stream will handle it automatically
    
    res.json(product);
    productEvents.emit('changed', { type: 'update', id: product.id });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // No need to manually notify - Change Stream will handle it automatically
    
    res.status(204).end();
    productEvents.emit('changed', { type: 'delete', id: product.id });
  } catch (err) {
    next(err);
  }
};

const stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = payload => {
    res.write(`event: products\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const handler = payload => sendEvent(payload);
  productEvents.on('changed', handler);
  sendEvent({ type: 'connected' });

  req.on('close', () => {
    productEvents.off('changed', handler);
  });
};

const getStats = async (req, res, next) => {
  try {
    let role;
    let userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        userId = decoded.sub;
      } catch (err) {
        // Ignore invalid tokens
      }
    }

    // Check if SuperAdmin is viewing a specific admin's stats
    const viewAsAdminId = req.query.viewAsAdminId;

    const stats = await productService.getStats({ 
      role, 
      userId, 
      viewAsAdminId: role === 'superadmin' ? viewAsAdminId : null 
    });
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

const getLowStock = async (req, res, next) => {
  try {
    let role;
    let userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        role = decoded.role;
        userId = decoded.sub;
      } catch (err) {
        // Ignore invalid tokens
      }
    }

    // Check if SuperAdmin is viewing a specific admin's low stock
    const viewAsAdminId = req.query.viewAsAdminId;

    const products = await productService.getLowStockProducts({ 
      role, 
      userId, 
      viewAsAdminId: role === 'superadmin' ? viewAsAdminId : null 
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  addReview,
  create,
  update,
  remove,
  stream,
  getStats,
  getLowStock
};

