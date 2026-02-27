const mongoose = require('mongoose');
const Order = require('../models/Order');
const { connectDb } = require('../config/db');

/**
 * Migration script to add productCreatedBy to existing order items
 * This fetches product details and adds the createdBy field to each item
 */

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:4003';

async function fetchProductDetails(productId) {
  try {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error.message);
    return null;
  }
}

async function migrateOrders() {
  try {
    // Connect to MongoDB using service config
    await connectDb();
    console.log('✅ Connected to MongoDB');

    // Find all orders
    const orders = await Order.find({});
    console.log(`📦 Found ${orders.length} orders to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const item of order.items) {
        // Skip if productCreatedBy already exists
        if (item.productCreatedBy) {
          continue;
        }

        // Fetch product details
        const product = await fetchProductDetails(item.productId);
        
        if (product && product.createdBy) {
          item.productCreatedBy = product.createdBy;
          orderModified = true;
          console.log(`✅ Added productCreatedBy to item ${item.productId} in order ${order.orderId}`);
        } else {
          console.log(`⚠️  Could not find createdBy for product ${item.productId}`);
        }
      }

      if (orderModified) {
        await order.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateOrders();
