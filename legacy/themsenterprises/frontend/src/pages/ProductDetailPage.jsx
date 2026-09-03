// src/pages/ProductDetailPage.jsx
import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiArrowLeft, FiTruck, FiTrash2, FiCheck } from 'react-icons/fi';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import ProductImageGallery from '../components/products/ProductImageGallery';
import CustomizationOptions from '../components/products/CustomizationOptions';
import ReviewSection from '../components/products/ReviewSection';
import { API_BASE } from '../constants/api';
import Spinner from '../components/common/Spinner';
import './ProductDetailPage.css';

// ===========================
// HELPER FUNCTIONS
// ===========================

// Check if customization is empty
const isEmptyCustomization = (customization) => {
  if (!customization) return true;
  if (Object.keys(customization).length === 0) return true;
  
  if (customization.dynamicCustomizations) {
    if (typeof customization.dynamicCustomizations === 'object' && 
        Object.keys(customization.dynamicCustomizations).length === 0) {
      return true;
    }
    return false;
  }
  
  return Object.values(customization).every(val => 
    val === null || 
    val === undefined || 
    val === '' || 
    (typeof val === 'object' && Object.keys(val).length === 0)
  );
};

// Get default customization for a product
const getDefaultCustomization = (product) => {
  let defaultCustomization = {};

  if (product.customizationOptions && product.customizationOptions.length > 0) {
    const dynamicCustomizations = {};

    product.customizationOptions.forEach(customization => {
      const option = customization.optionId;
      if (option.type === 'select') {
        const defaultOpt = option.options.find(opt => opt.priceModifier && opt.priceModifier.value === 0);
        if (defaultOpt) {
          dynamicCustomizations[option._id] = defaultOpt.value;
        }
      } else if (option.type === 'multi-select') {
        const defaultOpt = option.options.find(opt => opt.priceModifier && opt.priceModifier.value === 0);
        if (defaultOpt) {
          dynamicCustomizations[option._id] = [defaultOpt.value];
        }
      }
    });

    if (Object.keys(dynamicCustomizations).length > 0) {
      defaultCustomization = { dynamicCustomizations };
    }
  }

  return defaultCustomization;
};

// Calculate total price with customizations
const calculateTotalPrice = (basePrice, customizations, selectedCustomizations) => {
  let total = basePrice;

  if (!selectedCustomizations.dynamicCustomizations) return total;

  for (const [optionId, selectedValue] of Object.entries(selectedCustomizations.dynamicCustomizations)) {
    const customization = customizations.find(c => String(c.optionId._id) === String(optionId));
    if (!customization) continue;

    const option = customization.optionId;

    if (option.type === 'select') {
      const selectedOption = option.options.find(o => o.value === selectedValue);
      if (selectedOption && selectedOption.priceModifier) {
        const { operator, value } = selectedOption.priceModifier;
        if (operator === '+') total += value;
        else if (operator === '-') total -= value;
      }
    } else if (option.type === 'multi-select') {
      const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      for (const val of selectedValues) {
        const selectedOption = option.options.find(o => o.value === val);
        if (selectedOption && selectedOption.priceModifier) {
          const { operator, value } = selectedOption.priceModifier;
          if (operator === '+') total += value;
          else if (operator === '-') total -= value;
        }
      }
    } else if (option.type === 'boolean') {
      if (selectedValue !== false && option.priceModifier) {
        const { operator, value } = option.priceModifier;
        if (operator === '+') total += value;
        else if (operator === '-') total -= value;
      }
    }
  }

  return total;
};

// Render star rating
const renderStars = (rating, size = 'medium') => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<FaStar key={i} className={`star filled ${size}`} />);
  }

  if (hasHalfStar) {
    stars.push(<FaStarHalfAlt key="half" className={`star half ${size}`} />);
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<FaRegStar key={`empty-${i}`} className={`star empty ${size}`} />);
  }

  return stars;
};

// ===========================
// SIMILAR PRODUCT CARD (Outside main component)
// ===========================
const SimilarProductCard = ({ 
  product, 
  isLiked, 
  isWishlistLoading, 
  inCart, 
  isAdded, 
  onToggleLike, 
  onAddOrRemove,
  onNavigate 
}) => {
  const img = product?.images?.[0] || '/logo.png';
  const price = Number(product?.price || 0);
  const rating = Number(product?.rating || product?.averageRating || 0);
  const brandName = product?.brand || '';
  const pid = product?._id;

  const buttonLabel = isAdded
    ? (
      <>
        Added
        <FiCheck />
      </>
    )
    : inCart
    ? (
      <>
        <FiTrash2 />
        from Cart
      </>
    )
    : 'Add to Cart';

  const buttonClass = isAdded
    ? 'btn-added btn-cta'
    : inCart
    ? 'btn-remove btn-cta'
    : 'btn-add btn-cta';

  return (
    <div className="similar-card">
      <div className="similar-thumb">
        <img 
          src={img} 
          alt={product?.name || 'Product'} 
          loading="lazy" 
          decoding="async"
          onError={(e) => { e.target.src = '/logo.png'; }}
        />
        <div className="similar-thumb-overlay" />
        <button 
          type="button" 
          className="similar-view-btn" 
          onClick={(e) => { e.stopPropagation(); onNavigate(pid); }}
          aria-label="View product details"
        >
          Click to view product
        </button>
        {brandName && <div className="similar-badge">{brandName}</div>}
        {rating > 0 && (
          <div className="similar-rating-chip">
            <span className="material-icons star">star</span>
            <span className="ml-1">{rating.toFixed(1)}</span>
          </div>
        )}
        <button
          type="button"
          className={`similar-wishlist ${isLiked ? 'active' : ''}`}
          aria-pressed={isLiked}
          onClick={(e) => onToggleLike(pid, e)}
          disabled={isWishlistLoading}
          title={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span className="material-icons">{isLiked ? 'favorite' : 'favorite_border'}</span>
        </button>
      </div>

      <div className="similar-card-body">
        <div className="similar-meta">
          <div className="similar-title-price">
            <h3 className="similar-card-title" title={product?.name}>
              {product?.name}
            </h3>
            <p className="similar-card-price">₹{price.toFixed(0)}</p>
          </div>
          <button 
            type="button" 
            className={buttonClass} 
            onClick={(e) => onAddOrRemove(product, e)} 
            disabled={isAdded}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================
// MAIN COMPONENT
// ===========================
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart, getItemQuantity, removeProductFromCart, cart } = useContext(CartContext);
  const { user, addToWishlist, removeFromWishlist } = useAuth();
  const { showPopup } = useContext(PopupContext);

  // Refs for cleanup
  const abortControllerRef = useRef(null);
  const uploadAbortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  // Product state
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customization, setCustomization] = useState({});
  const [activeTab, setActiveTab] = useState('description');

  // Wishlist state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Similar products state
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Similar products interaction state
  const initialWishlistIds = useMemo(() => {
    const ids = user?.wishlist || [];
    return new Set(ids.map((id) => (typeof id === 'string' ? id : id?.toString?.() || '')));
  }, [user?.wishlist]);

  const [liked, setLiked] = useState(initialWishlistIds);
  const [wishlistLoadingSet, setWishlistLoadingSet] = useState(new Set());
  const [justAdded, setJustAdded] = useState(new Set());
  const [cartVersion, setCartVersion] = useState(0);

  // Update liked when user wishlist changes
  useEffect(() => {
    setLiked(initialWishlistIds);
  }, [initialWishlistIds]);

  // Update main product wishlist state
  useEffect(() => {
    if (user?.wishlist && product) {
      setIsWishlisted(user.wishlist.some(item => item.toString() === product._id));
    }
  }, [user?.wishlist, product]);

  // Fetch product
  useEffect(() => {
    let mounted = true;

    const fetchProduct = async () => {
      // Cleanup previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE}/products/${id}`, {
          signal: abortControllerRef.current.signal,
          timeout: 10000
        });

        if (!mounted) return;

        setProduct(response.data.product);
      } catch (err) {
        if (axios.isCancel(err) || !mounted) return;
        console.error('Error fetching product:', err);
        setError(err?.response?.data?.error || 'Failed to load product details');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  // Fetch similar products
  useEffect(() => {
    if (!product) return;

    let mounted = true;
    const controller = new AbortController();

    const fetchSimilarProducts = async () => {
      try {
        setSimilarLoading(true);
        const response = await axios.get(`${API_BASE}/products`, {
          signal: controller.signal,
          timeout: 10000
        });

        if (!mounted) return;

        const allProducts = response?.data?.products || [];
        
        // Filter similar products: same category or brand, but not the current product
        const similar = allProducts
          .filter(p => 
            p._id !== product._id && 
            (p.category === product.category || p.brand === product.brand)
          )
          .slice(0, 6);
        
        setSimilarProducts(similar);
      } catch (err) {
        if (axios.isCancel(err) || !mounted) return;
        console.error('Error fetching similar products:', err);
      } finally {
        if (mounted) {
          setSimilarLoading(false);
        }
      }
    };

    fetchSimilarProducts();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [product]);

  // Handlers
  const handleQuantityChange = useCallback((newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 1)) {
      setQuantity(newQuantity);
    }
  }, [product?.stock]);

  const handleCustomizationChange = useCallback((newCustomization) => {
    setCustomization(newCustomization);
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    const imageCustomizationId = '68dc1da4f36ac028a2d6d515';
    const dynamicCustomizations = customization.dynamicCustomizations || {};
    const imageCustomization = dynamicCustomizations[imageCustomizationId];

    if (imageCustomization?.file) {
      // Cleanup previous upload
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }

      uploadAbortControllerRef.current = new AbortController();

      try {
        const formData = new FormData();
        formData.append('images', imageCustomization.file);
        formData.append('customizationId', imageCustomizationId);

        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/customizations/upload-image`, {
          method: 'POST',
          body: formData,
          headers: headers,
          signal: uploadAbortControllerRef.current.signal
        });

        const result = await response.json();

        if (response.ok && result.success && result.urls?.length > 0) {
          const updatedCustomization = {
            ...customization,
            dynamicCustomizations: {
              ...dynamicCustomizations,
              [imageCustomizationId]: {
                ...imageCustomization,
                url: result.urls[0],
                name: imageCustomization.file.name,
                size: imageCustomization.file.size,
                type: imageCustomization.file.type,
                preview: URL.createObjectURL(imageCustomization.file)
              }
            }
          };

          setCustomization(updatedCustomization);
          addToCart(product, quantity, updatedCustomization);
        } else {
          console.error('Failed to upload image:', result);
          showPopup('Failed to upload image. Please try again.', 'error');
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error uploading image:', err);
        showPopup('Error uploading image. Please try again.', 'error');
        return;
      }
    } else {
      addToCart(product, quantity, customization);
    }
  }, [product, quantity, customization, addToCart]);

  const handleWishlistToggle = useCallback(async () => {
    if (!user) {
      showPopup('Please login to add to wishlist', 'info');
      return;
    }

    if (!product) return;

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        const result = await removeFromWishlist(product._id);
        if (result.success) {
          setIsWishlisted(false);
        } else {
          showPopup(result.error || 'Failed to update wishlist', 'error');
        }
      } else {
        const result = await addToWishlist(product._id);
        if (result.success) {
          setIsWishlisted(true);
        } else {
          showPopup(result.error || 'Failed to update wishlist', 'error');
        }
      }
    } catch (err) {
      console.error('Wishlist error:', err);
      showPopup('Failed to update wishlist', 'error');
    } finally {
      setWishlistLoading(false);
    }
  }, [isWishlisted, user, product, addToWishlist, removeFromWishlist, showPopup]);

  // Similar products handlers
  const isInCartSimple = useCallback((pid) => {
    const ctxCart = cart || [];

    if (Array.isArray(ctxCart) && ctxCart.length > 0) {
      return ctxCart.some(item => {
        const itemPid = item?.product?._id || item?.productId || item?._id;
        return itemPid === pid;
      });
    }

    try {
      const ls = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(ls) && ls.some(item => {
        const itemPid = item?.productId || item?.product?._id;
        return itemPid === pid;
      });
    } catch {
      return false;
    }
  }, [cart, cartVersion]);

  const handleToggleLike = useCallback(async (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      showPopup('Please login to add to wishlist', 'info');
      return;
    }

    setWishlistLoadingSet((prev) => new Set(prev).add(id));

    try {
      if (liked.has(id)) {
        const result = await removeFromWishlist(id);
        if (result.success) {
        } else {
          showPopup(result.error || 'Failed to update wishlist', 'error');
        }
      } else {
        const result = await addToWishlist(id);
        if (result.success) {
          setLiked((prev) => new Set(prev).add(id));
        } else {
          showPopup(result.error || 'Failed to update wishlist', 'error');
        }
      }
    } catch (err) {
      console.error('Wishlist error:', err);
      showPopup('Failed to update wishlist', 'error');
    } finally {
      setWishlistLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [user, liked, addToWishlist, removeFromWishlist]);

  const addToCartLS = useCallback((product, customization = {}) => {
    try {
      const raw = localStorage.getItem('cart') || '[]';
      const cart = JSON.parse(raw);
      const found = cart.find((i) => {
        const itemPid = i.productId || i?.product?._id;
        const itemCustomization = i?.customization || {};
        return itemPid === product._id && JSON.stringify(itemCustomization) === JSON.stringify(customization);
      });

      if (found) {
        found.quantity += 1;
      } else {
        cart.push({
          productId: product._id,
          product,
          quantity: 1,
          customization
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      setCartVersion((v) => v + 1);
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  }, []);

  const removeFromCartLS = useCallback((pid) => {
    try {
      const raw = localStorage.getItem('cart') || '[]';
      const cart = JSON.parse(raw).filter((i) => {
        const itemPid = i.productId || i?.product?._id;
        return itemPid !== pid;
      });
      localStorage.setItem('cart', JSON.stringify(cart));
      setCartVersion((v) => v + 1);
    } catch (err) {
      console.error('Error removing from cart:', err);
    }
  }, []);

  const handleAddOrRemove = useCallback(async (product, e) => {
    e.stopPropagation();
    e.preventDefault();
    e.target.blur();
    
    const pid = product._id;
    const inCartNow = isInCartSimple(pid);
    const scrollY = window.scrollY;

    if (inCartNow) {
      if (removeProductFromCart) {
        await removeProductFromCart(pid);
      } else {
        removeFromCartLS(pid);
      }
      setJustAdded((prev) => {
        const s = new Set(prev);
        s.delete(pid);
        return s;
      });
    } else {
      const defaultCustomization = getDefaultCustomization(product);

      if (addToCart) {
        await addToCart(product, 1, defaultCustomization);
      } else {
        addToCartLS(product, defaultCustomization);
      }
      
      setJustAdded((prev) => new Set(prev).add(pid));
      
      // Cleanup timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setJustAdded((prev) => {
          const s = new Set(prev);
          s.delete(pid);
          return s;
        });
      }, 800);
    }

    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, [isInCartSimple, removeProductFromCart, addToCart, addToCartLS, removeFromCartLS]);

  const handleNavigate = useCallback((pid) => {
    navigate(`/product/${pid}`);
  }, [navigate]);

  // Computed values
  const totalPrice = useMemo(() => {
    return product ? calculateTotalPrice(product.price, product.customizationOptions || [], customization) : 0;
  }, [product, customization]);





  const isInCartAlready = useMemo(() => {
    return product ? isInCart(product._id, customization) : false;
  }, [product, customization, isInCart]);

  const cartQuantity = useMemo(() => {
    return product ? getItemQuantity(product._id, customization) : 0;
  }, [product, customization, getItemQuantity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="loading-spinner">
            <Spinner />
            <p>Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="error-message">
            <h2>Product Not Found</h2>
            <p>{error || 'The requested product could not be found.'}</p>
            <Link to="/products" className="btn btn--primary">
              <FiArrowLeft /> Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={`/products?brand=${product.brand.replace(' ', '').toLowerCase()}`}>
            {product.brand}
          </Link>
          <span>/</span>
          <Link to={`/products?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <span>/</span>
          <span className="current">{product.name}</span>
        </nav>

        {/* Back Button */}
        <div className="back-button">
          <Link to={`/products?brand=${product.brand.replace(' ', '').toLowerCase()}`} className="btn btn--secondary">
            <FiArrowLeft /> Back to {product.brand} Products
          </Link>
        </div>

        <div className="product-detail">
          {/* Left Side - Image Gallery */}
          <div className="product-detail__gallery">
            <ProductImageGallery
              images={product.images}
              productName={product.name}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />
          </div>

          {/* Right Side - Product Details */}
          <div className="product-detail__info">
            <div className="product-detail__header">
              <h1 className="product-detail__title">{product.name}</h1>

              <div className="product-detail__rating">
                <div className="stars">
                  {renderStars(product.averageRating || 0)}
                </div>
                <span className="rating-value">{(product.averageRating || 0).toFixed(1)}</span>
                <span className="review-count">({product.totalReviews || 0} reviews)</span>
              </div>

              <div className="product-detail__price">
                <span className="price-current">₹{totalPrice.toLocaleString()}</span>
                {totalPrice !== product.price && (
                  <span className="price-base" style={{ paddingLeft: '10px' }}>
                    (Base price: ₹{product.price.toLocaleString()})
                  </span>
                )}
                {product.stock <= 10 && product.stock > 0 && (
                  <span className="stock-warning">Only {product.stock} left in stock</span>
                )}
                {product.stock === 0 && (
                  <span className="out-of-stock">Out of Stock</span>
                )}
              </div>

              <div className="product-detail__meta">
                <span className="brand">Brand: <strong>{product.brand}</strong></span>
                <span className="category">Category: <strong>{product.category}</strong></span>
                {product.sku && <span className="sku">SKU: <strong>{product.sku}</strong></span>}
              </div>
            </div>

            {/* Customization Options */}
            {product.customizationOptions && (
              <CustomizationOptions
                product={product}
                customization={customization}
                onCustomizationChange={handleCustomizationChange}
                quantity={quantity}
                onQuantityChange={handleQuantityChange}
              />
            )}

            {/* Action Buttons */}
            <div className="product-detail__actions">
              <button
                type="button"
                className={`btn ${isInCartAlready ? 'btn--secondary' : 'btn--primary'} btn--large`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <FiShoppingCart />
                {isInCartAlready
                  ? `Update Cart (${cartQuantity})`
                  : product.stock === 0
                    ? 'Out of Stock'
                    : 'Add to Cart'
                }
              </button>

              <button
                type="button"
                className={`btn btn--outline btn--large ${isWishlisted ? 'wishlisted' : ''}`}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                <FiHeart className={isWishlisted ? 'wishlisted' : ''} />
                {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

            {/* Shipping Info */}
            <div className="product-detail__shipping">
              <div className="shipping-info">
                <FiTruck />
                <div>
                  <strong>Free Shipping</strong> on orders above ₹500
                  <br />
                  <span className="shipping-time">
                    Estimated delivery: {product.customizationOptions?.turnaroundTime || '3-5 days'}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Tabs */}
            <div className="product-detail__tabs">
              <div className="tab-buttons">
                {['description', 'specifications', 'shipping'].map((tab) => (
                  <button
                    key={tab}
                    className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="tab-content">
                {activeTab === 'description' && (
                  <div className="tab-pane">
                    <p>{product.description}</p>
                    {product.tags && product.tags.length > 0 && (
                      <div className="product-tags">
                        <h4>Tags:</h4>
                        <div className="tags">
                          {product.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'specifications' && (
                  <div className="tab-pane">
                    <div className="specifications">
                      <div className="spec-item">
                        <span className="spec-label">Brand:</span>
                        <span className="spec-value">{product.brand}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Category:</span>
                        <span className="spec-value">{product.category}</span>
                      </div>
                      {product.sku && (
                        <div className="spec-item">
                          <span className="spec-label">SKU:</span>
                          <span className="spec-value">{product.sku}</span>
                        </div>
                      )}
                      {product.weight && (
                        <div className="spec-item">
                          <span className="spec-label">Weight:</span>
                          <span className="spec-value">{product.weight}g</span>
                        </div>
                      )}
                      {product.dimensions && (
                        <div className="spec-item">
                          <span className="spec-label">Dimensions:</span>
                          <span className="spec-value">
                            {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="tab-pane">
                    <div className="shipping-details">
                      <h4>Shipping Information</h4>
                      <ul>
                        <li>Free shipping on orders above ₹500</li>
                        <li>Standard delivery: 3-5 business days</li>
                        <li>Express delivery: 1-2 business days (additional charges apply)</li>
                        <li>Cash on Delivery available</li>
                        <li>Easy returns within 7 days</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewSection productId={product._id} product={product} />

        {/* Similar Products Section */}
        <div className="similar-products-section">
          <h2 className="similar-products-title">You Might Also Like</h2>
          {similarLoading ? (
            <div className="similar-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="similar-card">
                  <div className="similar-thumb skeleton" />
                  <div className="similar-card-body">
                    <div className="skeleton skeleton-line w-70" />
                    <div className="skeleton skeleton-line w-40" />
                    <div className="skeleton skeleton-cta" />
                  </div>
                </div>
              ))}
            </div>
          ) : similarProducts.length > 0 ? (
            <div className="similar-grid">
              {similarProducts.map((p) => (
                <SimilarProductCard
                  key={p._id}
                  product={p}
                  isLiked={liked.has(p._id)}
                  isWishlistLoading={wishlistLoadingSet.has(p._id)}
                  inCart={isInCartSimple(p._id)}
                  isAdded={justAdded.has(p._id)}
                  onToggleLike={handleToggleLike}
                  onAddOrRemove={handleAddOrRemove}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ) : (
            <p className="no-similar">No similar products found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;