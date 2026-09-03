const CustomizationOption = require('../models/customizationOption.model');

const seedDefaultCustomizations = async () => {
  try {
    const defaultCustomizations = [
      { _id: "68dc1da4f36ac028a2d6d515", name: "Image Upload", type: "boolean", priceModifier: { type: "fixed", value: 10, operator: "+" }, options: [{ value: "Image Upload", priceModifier: { operator: "+", value: 0 } }], isDefault: true, isActive: true },
      { name: "Available Sizes", type: "select", options: [
        { value: "S", priceModifier: { operator: "+", value: 0 } },
        { value: "M", priceModifier: { operator: "+", value: 5 } },
        { value: "L", priceModifier: { operator: "+", value: 10 } },
        { value: "XL", priceModifier: { operator: "+", value: 15 } }
      ], isDefault: true, isActive: true },
      { name: "Available Colors", type: "select", options: [
        { value: "white", priceModifier: { operator: "+", value: 0 } },
        { value: "black", priceModifier: { operator: "+", value: 5 } },
        { value: "red", priceModifier: { operator: "+", value: 10 } },
        { value: "green", priceModifier: { operator: "+", value: 10 } }
      ], isDefault: true, isActive: true }
    ];

    for (const customization of defaultCustomizations) {
      await CustomizationOption.findOneAndUpdate(
        { name: customization.name, isDefault: true },
        customization,
        { upsert: true, new: true }
      );
      console.log(`Seeded/Updated default customization: ${customization.name}`);
    }
  } catch (error) {
    console.error('Error seeding default customizations:', error);
  }
};

module.exports = { seedDefaultCustomizations };
