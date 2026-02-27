const { Product, getProductModel, generateSKU } = require('../models/Product');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

// Get all products from all category collections
const listProducts = async ({ role, userId, category, viewAsAdminId } = {}) => {
  console.log('🔍 [Product Service] listProducts called with:', { role, userId, category, viewAsAdminId });
  
  // If specific category requested, query only that collection
  if (category) {
    const CategoryModel = getProductModel(category);
    const query = { status: 'active' };
    
    // SuperAdmin viewing specific admin's products
    if (role === 'superadmin' && viewAsAdminId) {
      query.createdBy = viewAsAdminId;
      console.log('📝 [Product Service] SuperAdmin viewing specific admin:', viewAsAdminId);
    }
    // Admin viewing their own products
    else if (role === 'admin' && userId) {
      query.createdBy = userId;
      console.log('📝 [Product Service] Admin viewing own products:', userId);
    }
    // SuperAdmin viewing all products (no filter)
    else if (role === 'superadmin') {
      console.log('📝 [Product Service] SuperAdmin viewing all products (no filter)');
    } else {
      console.log('📝 [Product Service] Public view (no filter)');
    }
    
    console.log('🔍 [Product Service] Query:', JSON.stringify(query));
    const products = await CategoryModel.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    
    console.log(`✅ [Product Service] Found ${products.length} products in ${category}`);
    return products;
  }
  
  // Otherwise, get from all collections
  // Define all possible categories
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  const allProducts = [];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const query = { status: 'active' };
      
      // SuperAdmin viewing specific admin's products
      if (role === 'superadmin' && viewAsAdminId) {
        query.createdBy = viewAsAdminId;
      }
      // Admin viewing their own products
      else if (role === 'admin' && userId) {
        query.createdBy = userId;
      }
      // SuperAdmin viewing all products (no filter)
      
      const products = await CategoryModel.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      console.log(`📦 [Product Service] ${cat}: Found ${products.length} products`);
      allProducts.push(...products);
    } catch (err) {
      // Collection might not exist yet, skip
      console.log(`⚠️  [Product Service] ${cat}: Collection not found or empty`);
    }
  }
  
  // Manually populate createdBy from both Admin and SuperAdmin collections
  // Get all unique createdBy IDs
  const createdByIds = [...new Set(allProducts.map(p => p.createdBy).filter(Boolean))];
  console.log('🔍 [Product Service] Unique createdBy IDs:', createdByIds);
  
  // Fetch admins and superadmins
  const [admins, superAdmins] = await Promise.all([
    Admin.find({ _id: { $in: createdByIds } }).select('name email role').lean(),
    SuperAdmin.find({ _id: { $in: createdByIds } }).select('name email role').lean()
  ]);
  
  console.log('🔍 [Product Service] Admins found:', admins.length, admins);
  console.log('🔍 [Product Service] SuperAdmins found:', superAdmins.length, superAdmins);
  
  // Create a map of all creators
  const creatorsMap = new Map();
  admins.forEach(a => creatorsMap.set(a._id.toString(), { name: a.name, email: a.email, role: a.role || 'admin' }));
  superAdmins.forEach(sa => creatorsMap.set(sa._id.toString(), { name: sa.name, email: sa.email, role: 'superadmin' }));
  
  console.log('🔍 [Product Service] Creators map size:', creatorsMap.size);
  
  // Transform products to include createdByName
  const transformedProducts = allProducts.map(p => {
    const creator = p.createdBy ? creatorsMap.get(p.createdBy.toString()) : null;
    console.log(`🔍 [Product Transform] Product: ${p.name}, createdBy: ${p.createdBy}, creator:`, creator);
    return {
      ...p,
      createdByName: creator ? creator.name : 'Unknown',
      createdByRole: creator ? creator.role : 'admin'
    };
  });
  // Sort all products by createdAt
  transformedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  console.log(`✅ [Product Service] Total products found: ${transformedProducts.length}`);
  return transformedProducts.slice(0, 100);
};

// Get single product by ID
const getProductById = async (id) => {
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const product = await CategoryModel.findById(id).lean();
      
      if (product) {
        // Fetch creator info
        const [admin, superAdmin] = await Promise.all([
          Admin.findById(product.createdBy).select('name email role').lean(),
          SuperAdmin.findById(product.createdBy).select('name email role').lean()
        ]);
        
        const creator = admin || superAdmin;
        return {
          ...product,
          createdByName: creator ? creator.name : 'Unknown',
          createdByRole: creator ? creator.role : 'admin'
        };
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
};

// Add review to product
const addReview = async (productId, reviewData) => {
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const product = await CategoryModel.findById(productId);
      
      if (product) {
        // Add review
        product.reviews.push(reviewData);
        
        // Calculate new average rating
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.averageRating = totalRating / product.reviews.length;
        product.totalReviews = product.reviews.length;
        
        await product.save();
        return product.toObject();
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
};

const createProduct = async (payload) => {
  if (!payload.category) {
    throw new Error('Category is required');
  }
  
  const CategoryModel = getProductModel(payload.category);
  
  // Generate unique SKU if not provided
  if (!payload.sku) {
    let sku;
    let isUnique = false;
    
    // Try up to 5 times to generate a unique SKU
    for (let i = 0; i < 5; i++) {
      sku = generateSKU(payload.category);
      const existing = await CategoryModel.findOne({ sku });
      if (!existing) {
        isUnique = true;
        break;
      }
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique SKU. Please try again.');
    }
    
    payload.sku = sku;
  } else {
    // If SKU is provided, verify it's unique
    const existing = await CategoryModel.findOne({ sku: payload.sku });
    if (existing) {
      // Regenerate if not unique
      let sku;
      let isUnique = false;
      
      for (let i = 0; i < 5; i++) {
        sku = generateSKU(payload.category);
        const existingCheck = await CategoryModel.findOne({ sku });
        if (!existingCheck) {
          isUnique = true;
          break;
        }
      }
      
      if (!isUnique) {
        throw new Error('Failed to generate unique SKU. Please try again.');
      }
      
      payload.sku = sku;
    }
  }
  
  // Get model for specific category
  return CategoryModel.create(payload);
};

const updateProduct = async (id, payload) => {
  // If category is being changed, we need to move the product
  if (payload.category) {
    const CategoryModel = getProductModel(payload.category);
    
    // Try to find in the new category collection first
    let product = await CategoryModel.findById(id);
    
    if (!product) {
      // Product might be in different category, search all
      const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
      
      for (const cat of categories) {
        try {
          const OldCategoryModel = getProductModel(cat);
          product = await OldCategoryModel.findById(id);
          
          if (product) {
            // Found in old category, delete from old and create in new
            await OldCategoryModel.findByIdAndDelete(id);
            const newProduct = await CategoryModel.create({
              ...product.toObject(),
              ...payload,
              _id: id
            });
            return newProduct;
          }
        } catch (err) {
          continue;
        }
      }
    }
    
    // Update in same category
    return CategoryModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });
  }
  
  // If no category change, try to find and update
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const product = await CategoryModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
      });
      
      if (product) {
        return product;
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
};

const deleteProduct = async (id) => {
  // Try to delete from all category collections
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const product = await CategoryModel.findByIdAndDelete(id);
      
      if (product) {
        return product;
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
};

const getStats = async ({ role, userId, viewAsAdminId } = {}) => {
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  let total = 0;
  let totalValue = 0;
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const query = { status: 'active' };
      
      // SuperAdmin viewing specific admin's stats
      if (role === 'superadmin' && viewAsAdminId) {
        query.createdBy = viewAsAdminId;
      }
      // Admin viewing their own stats
      else if (role === 'admin' && userId) {
        query.createdBy = userId;
      }
      // SuperAdmin viewing overall stats (no filter)
      
      const count = await CategoryModel.countDocuments(query);
      total += count;
      
      const value = await CategoryModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
      ]);
      
      totalValue += value[0]?.total || 0;
    } catch (err) {
      continue;
    }
  }
  
  return {
    total,
    count: total,
    totalProducts: total,
    totalValue
  };
};

const getLowStockProducts = async ({ role, userId, viewAsAdminId, threshold = 10 } = {}) => {
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  const allLowStock = [];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      const query = { 
        status: 'active', 
        stock: { $lte: threshold } 
      };
      
      // SuperAdmin viewing specific admin's low stock
      if (role === 'superadmin' && viewAsAdminId) {
        query.createdBy = viewAsAdminId;
      }
      // Admin viewing their own low stock
      else if (role === 'admin' && userId) {
        query.createdBy = userId;
      }
      // SuperAdmin viewing overall low stock (no filter)
      
      const products = await CategoryModel.find(query)
        .sort({ stock: 1 })
        .limit(20);
      
      allLowStock.push(...products);
    } catch (err) {
      continue;
    }
  }
  
  // Sort by stock and return top 20
  allLowStock.sort((a, b) => a.stock - b.stock);
  return allLowStock.slice(0, 20);
};

const getTopSellingProducts = async (limit = 10) => {
  const categories = ['menswear', 'womenwear', 'kidswear', 'winterwear', 'summerwear', 'footwear'];
  const allProducts = [];
  
  for (const cat of categories) {
    try {
      const CategoryModel = getProductModel(cat);
      // Get products sorted by rating and review count (proxy for popularity)
      const products = await CategoryModel.find({ status: 'active' })
        .sort({ 
          averageRating: -1, 
          totalReviews: -1,
          createdAt: -1 
        })
        .limit(limit)
        .lean();
      
      allProducts.push(...products);
    } catch (err) {
      console.log(`⚠️  [Top Selling] ${cat}: Collection not found or empty`);
      continue;
    }
  }
  
  // Sort all products by rating and reviews
  allProducts.sort((a, b) => {
    // First by average rating
    if (b.averageRating !== a.averageRating) {
      return (b.averageRating || 0) - (a.averageRating || 0);
    }
    // Then by total reviews
    if (b.totalReviews !== a.totalReviews) {
      return (b.totalReviews || 0) - (a.totalReviews || 0);
    }
    // Finally by creation date (newer first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  // Return top N products
  return allProducts.slice(0, limit);
};

module.exports = {
  listProducts,
  getProductById,
  addReview,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
  getLowStockProducts,
  getTopSellingProducts
};
