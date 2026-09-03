import React, { createContext, useState, useEffect } from 'react';
import httpClient from '../services/httpClient';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const { user } = useAuth();

  // Load cart from backend for logged-in users
  const loadCartFromBackend = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await httpClient.get('/cart');
      const validCart = (response.data.cart || [])
        .filter(item => item.product && item.product._id);
      setCart(validCart);
    } catch (error) {
      console.error('Error loading cart from backend:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      } else {
        setError('Failed to load cart');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load cart on app start and when user changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      loadCartFromBackend();
    } else if (!token) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          const normalizedCart = parsedCart
            .filter(item => item.product && item.product._id)
            .map(item => ({
              ...item,
              customization: item.customization || {}
            }));
          setCart(normalizedCart);
        } catch (error) {
          console.error('Error loading cart from localStorage:', error);
          localStorage.removeItem('cart');
          setCart([]);
        }
      } else {
        setCart([]);
      }
    }
  }, [user]);

  // Save cart to localStorage whenever cart changes (for guest users)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Add item to cart
  const addToCart = async (productOrId, quantity = 1, customization = {}) => {
    const token = localStorage.getItem('token');
    const productId = typeof productOrId === 'string' ? productOrId : productOrId?._id;
    const fullProduct = typeof productOrId === 'string' ? null : productOrId || null;

    if (!productId) {
      setError('Invalid product');
      return;
    }

    if (token) {
      try {
        setLoading(true);
        const response = await httpClient.post('/cart', { productId, quantity, customization });
        const normalizedCart = (response.data.cart || [])
          .filter(item => item.product && item.product._id)
          .map(item => ({ ...item, customization: item.customization || {} }));
        setCart(normalizedCart);
        setError(null);
      } catch (error) {
        console.error('Error adding to cart:', error.response?.data || error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
        }
        setError(error.response?.data?.error || 'Failed to add item to cart');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest fallback
      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex(
          item =>
            (item.product?._id || item.productId) === productId &&
            JSON.stringify(item.customization || {}) === JSON.stringify(customization)
        );
        if (existingIndex > -1) {
          const updated = [...prevCart];
          updated[existingIndex].quantity += quantity;
          return updated;
        } else {
          return [
            ...prevCart,
            {
              product: fullProduct ? fullProduct : { _id: productId },
              productId,
              quantity,
              customization,
              addedAt: new Date().toISOString(),
            },
          ];
        }
      });
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, customization, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, customization);
      return;
    }
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setLoading(true);
        const userCart = cart.find(
          item =>
            item.product._id === productId &&
            JSON.stringify(item.customization || {}) === JSON.stringify(customization)
        );
        if (userCart) {
          const response = await httpClient.put(`/cart/${userCart._id}`, { quantity: newQuantity });
          const normalizedCart = (response.data.cart || [])
            .filter(item => item.product && item.product._id)
            .map(item => ({ ...item, customization: item.customization || {} }));
          setCart(normalizedCart);
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
        setError('Failed to update quantity');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest
      setCart(prevCart =>
        prevCart.map(item =>
          item.product._id === productId &&
          JSON.stringify(item.customization || {}) === JSON.stringify(customization)
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId, customization = {}) => {
    const token = localStorage.getItem('token');

    // Check if item has uploaded images that need to be deleted
    const imageCustomizationId = '68dc1da4f36ac028a2d6d515';
    const dynamicCustomizations = customization.dynamicCustomizations || {};
    const imageCustomization = dynamicCustomizations[imageCustomizationId];

    if (imageCustomization && imageCustomization.url) {
      try {
        // Delete the image from S3
        const deleteResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/customizations/delete-image`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrls: [imageCustomization.url]
          })
        });

        if (!deleteResponse.ok) {
          console.warn('Failed to delete image from S3:', await deleteResponse.text());
        } else {
          console.log('✅ Image deleted from S3:', imageCustomization.url);
        }
      } catch (error) {
        console.error('❌ Error deleting image from S3:', error);
      }
    }

    if (token) {
      try {
        setLoading(true);
        const userCart = cart.find(
          item =>
            item.product._id === productId &&
            JSON.stringify(item.customization || {}) === JSON.stringify(customization)
        );
        if (userCart) {
          const response = await httpClient.delete(`/cart/${userCart._id}`);
          const normalizedCart = (response.data.cart || [])
            .filter(item => item.product && item.product._id)
            .map(item => ({ ...item, customization: item.customization || {} }));
          setCart(normalizedCart);
        }
      } catch (error) {
        console.error('Error removing from cart:', error);
        setError('Failed to remove item from cart');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest
      setCart(prevCart =>
        prevCart.filter(
          item =>
            !(
              item.product._id === productId &&
              JSON.stringify(item.customization || {}) === JSON.stringify(customization)
            )
        )
      );
    }
  };

  // Remove all instances of a product from cart (regardless of customization)
  const removeProductFromCart = async (productId) => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        setLoading(true);
        // Find all cart items with this productId
        const itemsToRemove = cart.filter(item => item.product._id === productId);

        // Remove each item one by one
        for (const item of itemsToRemove) {
          // Check if item has uploaded images that need to be deleted
          const imageCustomizationId = '68dc1da4f36ac028a2d6d515';
          const dynamicCustomizations = item.customization?.dynamicCustomizations || {};
          const imageCustomization = dynamicCustomizations[imageCustomizationId];

          if (imageCustomization && imageCustomization.url) {
            try {
              // Delete the image from S3
              const deleteResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/customizations/delete-image`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  imageUrls: [imageCustomization.url]
                })
              });

              if (!deleteResponse.ok) {
                console.warn('Failed to delete image from S3:', await deleteResponse.text());
              } else {
                console.log('✅ Image deleted from S3:', imageCustomization.url);
              }
            } catch (error) {
              console.error('❌ Error deleting image from S3:', error);
            }
          }

          // Remove the item from backend
          await httpClient.delete(`/cart/${item._id}`);
        }

        // Reload cart from backend to get updated state
        const response = await httpClient.get('/cart');
        const normalizedCart = (response.data.cart || [])
          .filter(item => item.product && item.product._id)
          .map(item => ({ ...item, customization: item.customization || {} }));
        setCart(normalizedCart);
      } catch (error) {
        console.error('Error removing product from cart:', error);
        setError('Failed to remove product from cart');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest - remove all instances of this product
      setCart(prevCart =>
        prevCart.filter(item => item.product._id !== productId)
      );
    }
  };

  // Clear cart
  const clearCart = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        setLoading(true);
        const response = await httpClient.delete('/cart');
        const normalizedCart = (response.data.cart || [])
          .filter(item => item.product && item.product._id)
          .map(item => ({ ...item, customization: item.customization || {} }));
        setCart(normalizedCart);
      } catch (error) {
        console.error('Error clearing cart:', error);
        setError('Failed to clear cart');
      } finally {
        setLoading(false);
      }
    } else {
      setCart([]);
    }
  };

  // Get total items count
  const getTotalItems = () => cart.reduce((total, item) => total + item.quantity, 0);

  // 🔥 Calculate price incl. customizations
  const calculateItemPrice = (product, customization) => {
    let total = product.price || 0;
    if (!customization.dynamicCustomizations) return total;

    for (const [optionId, selectedObj] of Object.entries(customization.dynamicCustomizations)) {
      // new structure: { name, value }
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

  const getTotalPrice = () =>
    cart.reduce((total, item) => {
      const price = calculateItemPrice(item.product, item.customization);
      return total + price * item.quantity;
    }, 0);

  const getCartByBrand = () =>
    cart.reduce((acc, item) => {
      const brand = item.product.brand || 'Other';
      if (!acc[brand]) acc[brand] = [];
      acc[brand].push(item);
      return acc;
    }, {});

  const isInCart = (productId, customization = {}) =>
    cart.some(
      item =>
        item.product &&
        item.product._id === productId &&
        JSON.stringify(item.customization || {}) === JSON.stringify(customization)
    );

  const getItemQuantity = (productId, customization = {}) => {
    const item = cart.find(
      item =>
        item.product._id === productId &&
        JSON.stringify(item.customization || {}) === JSON.stringify(customization)
    );
    return item ? item.quantity : 0;
  };

  const applyCoupon = async (code, subtotal) => {
    try {
      const response = await httpClient.post('/coupons/validate', { code, subtotal });
      if (response.data.success) {
        setAppliedCoupon(response.data.coupon);
        return { success: true };
      } else {
        setAppliedCoupon(null);
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      setAppliedCoupon(null);
      return { success: false, message: err.message || 'An error occurred' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const syncCartWithBackend = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await httpClient.get('/cart');
      const backendCart = (response.data.cart || [])
        .filter(item => item.product && item.product._id)
        .map(item => ({ ...item, customization: item.customization || {} }));

      setCart(backendCart);
    } catch (error) {
      console.error('Error syncing cart with backend:', error);
      setError('Failed to sync cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        appliedCoupon,
        addToCart,
        updateQuantity,
        removeFromCart,
        removeProductFromCart,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getCartByBrand,
        isInCart,
        getItemQuantity,
        syncCartWithBackend,
        calculateItemPrice,
        applyCoupon,
        removeCoupon,
        setCart, // Expose setCart for local updates
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export { CartContext, CartProvider, useCart };
