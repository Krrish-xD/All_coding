const { User, Product } = require('../models');
const { validationResult } = require('express-validator');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

// Helper function to parse body if it's a string (Lambda issue)
const parseBody = (body) => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse body string:', e);
      return body;
    }
  }
  return body;
};

// 🔥 Helper to transform customizations safely
const transformCart = (user) => {
  return user.cart.map((item) => {
    const customization = item.customization || {};
    const dynamicCustomizations = customization.dynamicCustomizations || {};
    const customizationsMap = {};

    // Build map of id -> name from product.customizations
    if (item.product && item.product.customizations) {
      item.product.customizations.forEach((cust) => {
        const optionId = cust.optionId;
        if (optionId && optionId._id && optionId.name) {
          customizationsMap[optionId._id.toString()] = optionId.name;
        }
      });
    }

    // Keep IDs for calculation, but also store name for UI
    const dynamicCustomizationsWithNames = {};
    Object.entries(dynamicCustomizations).forEach(([id, val]) => {
      const name = customizationsMap[id] || id;
      dynamicCustomizationsWithNames[id] = { name, value: val };
    });

    return {
      ...item.toObject(),
      customization: {
        ...customization,
        dynamicCustomizations: dynamicCustomizationsWithNames,
      },
    };
  });
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cart.product', 'name images price brand category stock')
      .populate({
        path: 'cart.product',
        select: 'name images price brand category stock customizations',
        populate: {
          path: 'customizations.optionId',
          model: 'CustomizationOption',
        },
      });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const cartWithCustomizationNames = transformCart(user);

    res.status(200).json({ success: true, cart: cartWithCustomizationNames });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, error: 'Server error getting cart' });
  }
};

// @desc    Add product to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const body = parseBody(req.body);
    const { productId, quantity = 1, customization = {} } = body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        available: product.stock,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const existingItemIndex = user.cart.findIndex(
      (item) =>
        item.product.toString() === productId &&
        JSON.stringify(item.customization || {}) === JSON.stringify(customization || {})
    );

    if (existingItemIndex > -1) {
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      user.cart.push({
        product: productId,
        quantity,
        customization,
        addedAt: new Date(),
      });
    }

    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name images price brand category stock customizations',
      populate: {
        path: 'customizations.optionId',
        model: 'CustomizationOption',
      },
    });

    const cartWithCustomizationNames = transformCart(user);

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      cart: cartWithCustomizationNames,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error adding to cart' });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const body = parseBody(req.body);
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantity must be at least 1' });
    }

    const user = await User.findById(req.user._id);
    const itemIndex = user.cart.findIndex((item) => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    const product = await Product.findById(user.cart[itemIndex].product);

    if (!product) {
      // If product is not found (e.g., deleted), handle it gracefully
      user.cart.splice(itemIndex, 1); // Remove the invalid item from the cart
      await user.save();
      return res.status(404).json({ success: false, error: 'Product not found in cart, item removed.' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        available: product.stock,
      });
    }

    user.cart[itemIndex].quantity = quantity;
    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name images price brand category stock customizations',
      populate: {
        path: 'customizations.optionId',
        model: 'CustomizationOption',
      },
    });

    const cartWithCustomizationNames = transformCart(user);

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      cart: cartWithCustomizationNames,
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, error: 'Server error updating cart item' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user = await User.findById(req.user._id);
    const itemIndex = user.cart.findIndex((item) => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    // Check if item has uploaded images that need to be deleted
    const item = user.cart[itemIndex];
    const imageCustomizationId = '68dc1da4f36ac028a2d6d515';
    const dynamicCustomizations = item.customization?.dynamicCustomizations || {};
    const imageCustomization = dynamicCustomizations[imageCustomizationId];

    if (imageCustomization && imageCustomization.url) {
      try {
        // Delete the image from S3
        const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';
        const urlParts = imageCustomization.url.split('/');
        const key = urlParts.slice(-2).join('/'); // customizations/uuid.ext

        const deleteParams = {
          Bucket: bucketName,
          Key: key
        };

        await s3.deleteObject(deleteParams).promise();
        console.log('✅ Image deleted from S3:', imageCustomization.url);
      } catch (error) {
        console.error('❌ Error deleting image from S3:', error);
        // Don't fail the cart removal if image deletion fails
      }
    }

    user.cart.splice(itemIndex, 1);
    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name images price brand category stock customizations',
      populate: {
        path: 'customizations.optionId',
        model: 'CustomizationOption',
      },
    });

    const cartWithCustomizationNames = transformCart(user);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart: cartWithCustomizationNames,
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, error: 'Server error removing from cart' });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { cart: [] } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: [],
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, error: 'Server error clearing cart' });
  }
};

// @desc    Get cart count
// @route   GET /api/cart/count
// @access  Private
const getCartCount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const totalItems = user.cart.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({ success: true, count: totalItems });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({ success: false, error: 'Server error getting cart count' });
  }
};





// @desc    Get user's saved for later list
// @route   GET /api/cart/saved
// @access  Private
const getSavedForLater = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedForLater.product', 'name images price brand category stock');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, savedForLater: user.savedForLater });
  } catch (error) {
    console.error('Get saved for later error:', error);
    res.status(500).json({ success: false, error: 'Server error getting saved for later list' });
  }
};


// @desc    Move item from cart to saved for later
// @route   POST /api/cart/save-for-later/:itemId
// @access  Private
const saveForLater = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user = await User.findById(req.user._id);

    const itemIndex = user.cart.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    const [itemToSave] = user.cart.splice(itemIndex, 1);
    
    // Check if item already exists in savedForLater
    const existingSavedItemIndex = user.savedForLater.findIndex(
      (item) =>
        item.product.toString() === itemToSave.product.toString() &&
        JSON.stringify(item.customization || {}) === JSON.stringify(itemToSave.customization || {})
    );

    if (existingSavedItemIndex > -1) {
      // If it exists, just remove from cart, don't add a duplicate
    } else {
      user.savedForLater.push(itemToSave);
    }

    await user.save();
    await user.populate('cart.product savedForLater.product', 'name images price brand category stock');

    res.status(200).json({
      success: true,
      message: 'Item moved to saved for later',
      cart: user.cart,
      savedForLater: user.savedForLater
    });
  } catch (error) {
    console.error('Save for later error:', error);
    res.status(500).json({ success: false, error: 'Server error saving for later' });
  }
};

// @desc    Move item from saved for later to cart
// @route   POST /api/cart/move-to-cart/:itemId
// @access  Private
const moveToCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user = await User.findById(req.user._id);

    const itemIndex = user.savedForLater.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Saved item not found' });
    }

    const [itemToMove] = user.savedForLater.splice(itemIndex, 1);

    // Check if item already exists in cart
    const existingCartItemIndex = user.cart.findIndex(
      (item) =>
        item.product.toString() === itemToMove.product.toString() &&
        JSON.stringify(item.customization || {}) === JSON.stringify(itemToMove.customization || {})
    );

    if (existingCartItemIndex > -1) {
      user.cart[existingCartItemIndex].quantity += itemToMove.quantity;
    } else {
      user.cart.push(itemToMove);
    }

    await user.save();
    await user.populate('cart.product savedForLater.product', 'name images price brand category stock');

    res.status(200).json({
      success: true,
      message: 'Item moved to cart',
      cart: user.cart,
      savedForLater: user.savedForLater
    });
  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({ success: false, error: 'Server error moving to cart' });
  }
};

// @desc    Remove item from saved for later
// @route   DELETE /api/cart/saved/:itemId
// @access  Private
const removeFromSaved = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { savedForLater: { _id: itemId } } },
      { new: true }
    ).populate('savedForLater.product', 'name images price brand category stock');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Item removed from saved for later',
      savedForLater: user.savedForLater
    });
  } catch (error) {
    console.error('Remove from saved error:', error);
    res.status(500).json({ success: false, error: 'Server error removing from saved list' });
  }
};


module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  getSavedForLater,
  saveForLater,
  moveToCart,
  removeFromSaved
};