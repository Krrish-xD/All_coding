const { Coupon, Setting, Product } = require('../models');

/**
 * Calculates the price for a single item, including customizations.
 * @param {Object} product - The product document from the database.
 * @param {Object} customization - The customization options for the item.
 * @returns {number} - The calculated price for the single item.
 */
const calculateItemPrice = (product, customization) => {
  let total = product.price || 0;
  if (!customization || !customization.dynamicCustomizations) return total;

  for (const [optionId, selectedObj] of Object.entries(customization.dynamicCustomizations)) {
    const selectedValue =
      typeof selectedObj === 'object' && selectedObj !== null && 'value' in selectedObj
        ? selectedObj.value
        : selectedObj;

    const customizationOption = product.customizations?.find(
      c => String(c.optionId._id) === String(optionId)
    );
    if (!customizationOption) continue;

    const option = customizationOption.optionId;

    if (option.type === 'select') {
      const selectedOption = option.options.find(o => o.value === selectedValue);
      if (selectedOption?.priceModifier) {
        const { operator, value } = selectedOption.priceModifier;
        total += operator === '+' ? value : -value;
      }
    } else if (option.type === 'multi-select') {
      const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      selectedValues.forEach(val => {
        const selectedOption = option.options.find(o => o.value === val);
        if (selectedOption?.priceModifier) {
          const { operator, value } = selectedOption.priceModifier;
          total += operator === '+' ? value : -value;
        }
      });
    } else if (option.type === 'boolean') {
      if (selectedValue !== false && option.priceModifier) {
        const { operator, value } = option.priceModifier;
        total += operator === '+' ? value : -value;
      }
    }
  }
  return total;
};

/**
 * Calculates the complete order total, including items, shipping, tax, and discounts.
 * @param {Array} cartItems - Array of items from the client (e.g., [{ product: 'id', quantity: 2, customization: {...} }]).
 * @param {string} [couponCode] - An optional coupon code.
 * @returns {Object} - A full breakdown of the pricing.
 */
const calculateOrderTotal = async (cartItems, couponCode) => {
  const result = {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    couponDiscount: 0,
    finalTotal: 0,
    validatedItems: [],
    error: null,
  };

  if (!cartItems || cartItems.length === 0) {
    return result;
  }

  // 1. Fetch all products and calculate subtotal with customizations
  for (const item of cartItems) {
    const product = await Product.findById(item.product).populate('customizations.optionId');
    if (!product) {
      result.error = `Product with ID ${item.product} not found.`;
      return result;
    }
    if (!product.isInStock(item.quantity)) {
        result.error = `Insufficient stock for ${product.name}.`;
        return result;
    }

    const itemPrice = calculateItemPrice(product, item.customization);
    result.subtotal += itemPrice * item.quantity;
    result.validatedItems.push({ 
        product: product._id, 
        quantity: item.quantity, 
        price: itemPrice, // Use the calculated price
        customisation: item.customization || {}
    });
  }

  let priceAfterCoupon = result.subtotal;
  let freeShippingFromCoupon = false;

  // 2. Apply coupon code if provided
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (coupon && coupon.expiryDate >= new Date() && result.subtotal >= coupon.minPurchase) {
      if (coupon.discountType === 'fixed') {
        result.couponDiscount = Math.min(coupon.discountValue, result.subtotal);
      } else if (coupon.discountType === 'percentage') {
        result.couponDiscount = (result.subtotal * coupon.discountValue) / 100;
      } else if (coupon.discountType === 'free_shipping') {
        freeShippingFromCoupon = true;
      }
      priceAfterCoupon -= result.couponDiscount;
    }
  }

  // 3. Fetch shipping and tax settings and calculate
  const settings = await Setting.find({ key: { $in: ['freeShippingThreshold', 'standardShippingCost', 'defaultTaxRate', 'applyTaxToShipping'] } });
  const getSetting = (key, defaultValue) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const freeShippingThreshold = getSetting('freeShippingThreshold', 2000);
  const standardShippingCost = getSetting('standardShippingCost', 100);
  const defaultTaxRate = getSetting('defaultTaxRate', 18);
  const applyTaxToShipping = getSetting('applyTaxToShipping', true);

  if (freeShippingFromCoupon) {
    result.shipping = 0;
  } else if (priceAfterCoupon < freeShippingThreshold) {
    result.shipping = standardShippingCost;
  }

  const taxBase = applyTaxToShipping ? (priceAfterCoupon + result.shipping) : priceAfterCoupon;
  result.tax = taxBase * (defaultTaxRate / 100);

  // 4. Calculate final total
  result.finalTotal = Math.floor(priceAfterCoupon + result.shipping + result.tax);

  return result;
};

module.exports = { calculateOrderTotal, calculateItemPrice };