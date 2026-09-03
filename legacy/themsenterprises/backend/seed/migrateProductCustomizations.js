const Product = require('../models/product.model');
const CustomizationOption = require('../models/customizationOption.model');

const migrateProductCustomizations = async () => {
  try {
    console.log('🔄 Migrating existing products to embed customization details...');

    // Get all products
    const products = await Product.find({});

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;

      // Check if customizations need migration
      if (product.customizations && product.customizations.length > 0) {
        for (let i = 0; i < product.customizations.length; i++) {
          const cust = product.customizations[i];

          // If optionId is a string or ObjectId, it needs migration
          if (cust.optionId && (typeof cust.optionId === 'string' || cust.optionId.constructor.name === 'ObjectId')) {
            // Fetch the customization option
            const customizationOption = await CustomizationOption.findById(cust.optionId);
            if (customizationOption) {
              product.customizations[i].optionId = {
                _id: customizationOption._id,
                name: customizationOption.name,
                type: customizationOption.type,
                priceModifier: customizationOption.priceModifier,
                options: customizationOption.options,
                isActive: customizationOption.isActive
              };
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`✅ Migrated product: ${product.name}`);
      }
    }

    console.log(`🎉 Migrated ${updatedCount} products`);

  } catch (error) {
    console.error('❌ Error migrating products:', error);
  }
};

module.exports = { migrateProductCustomizations };
