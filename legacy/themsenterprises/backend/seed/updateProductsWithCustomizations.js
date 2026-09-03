const Product = require('../models/product.model');
const CustomizationOption = require('../models/customizationOption.model');

const updateProductsWithDefaults = async () => {
  try {
    console.log('🔄 Updating products with default customizations...');

    // Fetch all default active customizations
    const defaultCustomizations = await CustomizationOption.find({
      isDefault: true,
      isActive: true
    });

    if (defaultCustomizations.length === 0) {
      console.log('⚠️ No default customizations found. Skipping update.');
      return;
    }

    console.log(`📋 Found ${defaultCustomizations.length} default customizations`);

    // Get all products
    const products = await Product.find({});

    let updatedCount = 0;

    for (const product of products) {
      // Check if product has customizations
      if (!product.customizations || product.customizations.length === 0) {
        // Add all default customizations
        product.customizations = defaultCustomizations.map(customization => ({
          optionId: {
            _id: customization._id,
            name: customization.name,
            type: customization.type,
            priceModifier: customization.priceModifier,
            options: customization.options,
            isActive: customization.isActive
          },
          enabled: true
        }));

        await product.save();
        updatedCount++;
        console.log(`✅ Updated product: ${product.name}`);
      }
    }

    console.log(`🎉 Updated ${updatedCount} products with default customizations`);

  } catch (error) {
    console.error('❌ Error updating products with customizations:', error);
  }
};

module.exports = { updateProductsWithDefaults };
