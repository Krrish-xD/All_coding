const Product = require('../models/product.model');

const migratePriceModifier = async () => {
  try {
    console.log('🔄 Migrating priceModifier from string to object...');

    // Find products with customizations
    const products = await Product.find({ 'customizations.0': { $exists: true } });

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;

      for (const customization of product.customizations) {
        if (customization.optionId && customization.optionId.priceModifier) {
          const pm = customization.optionId.priceModifier;

          // If priceModifier is a string, convert to object
          if (typeof pm === 'string') {
            const value = parseFloat(pm.replace(/[^\d.-]/g, '')) || 0;
            const operator = pm.includes('-') ? '-' : '+';
            customization.optionId.priceModifier = {
              type: 'fixed',
              value: value,
              operator: operator
            };
            needsUpdate = true;
          }

          // Check options array
          if (customization.optionId.options && Array.isArray(customization.optionId.options)) {
            for (const option of customization.optionId.options) {
              if (option.priceModifier && typeof option.priceModifier === 'string') {
                const value = parseFloat(option.priceModifier.replace(/[^\d.-]/g, '')) || 0;
                const operator = option.priceModifier.includes('-') ? '-' : '+';
                option.priceModifier = {
                  operator: operator,
                  value: value
                };
                needsUpdate = true;
              }
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
    console.error('❌ Error migrating priceModifier:', error);
  }
};

module.exports = { migratePriceModifier };
