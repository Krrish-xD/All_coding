// src/pages/ProductsPage.jsx
import { useEffect, useMemo, useRef, useState, useContext, useCallback } from 'react';
import { FiTrash2, FiCheck } from 'react-icons/fi';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import { API_BASE } from '../constants/api';
import CustomDropdown from '../components/common/CustomDropdown';
import './ProductsPage.css';

const BRAND_MS = 'MS Enterprises';
const BRAND_JAKSH = 'Jaksh';
const INITIAL_LOAD = 24;
const LOAD_MORE = 24;

// Helper: Check if customization is empty
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

// Helper: Get default customization for a product
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

// Product Card Component (moved outside for performance)
const ProductCard = ({
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

  const handleCardClick = (e) => {
    if (e.target.closest('button,select,input')) return;
    onNavigate(pid);
  };

  return (
    <div className="card" onClick={handleCardClick}>
      <div className="thumb">
        <img
          src={img}
          alt={product?.name || 'Product'}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.src = '/logo.png'; }}
        />
        {brandName && <div className="badge">{brandName}</div>}
        {rating > 0 && (
          <div className="rating-chip">
            <span className="material-icons star">star</span>
            <span className="ml-1">{rating.toFixed(1)}</span>
          </div>
        )}
        <button
          type="button"
          className={`wishlist ${isLiked ? 'active' : ''}`}
          aria-pressed={isLiked}
          onClick={(e) => onToggleLike(pid, e)}
          disabled={isWishlistLoading}
          title={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <span className="material-icons">{isLiked ? 'favorite' : 'favorite_border'}</span>
        </button>
      </div>

      <div className="card-body">
        <div className="meta">
          <div className="title-price">
            <h3 className="card-title" title={product?.name}>
              {product?.name}
            </h3>
            <p className="card-price">₹{price.toFixed(0)}</p>
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

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get brand from URL query param
  const brandParam = searchParams.get('brand');
  const activeBrand = brandParam === 'ms' ? BRAND_MS : brandParam === 'jaksh' ? BRAND_JAKSH : 'all';

  // Contexts
  const cartCtx = useContext(CartContext);
  const { user, addToWishlist, removeFromWishlist } = useAuth();
  const { showPopup } = useContext(PopupContext);
  const { removeProductFromCart } = cartCtx;

  // Data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters + UI
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    brand: activeBrand,
    category: 'all',
    priceMin: 0,
    priceMax: 0,
    rating: 0,
    sort: 'name-asc',
  });

  // Effect to sync URL param with filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, brand: activeBrand }));
  }, [activeBrand]);

  // Wishlist
  const initialWishlistIds = useMemo(() => {
    const ids = user?.wishlist || [];
    return new Set(ids.map((id) => (typeof id === 'string' ? id : id?.toString?.() || '')));
  }, [user?.wishlist]);

  const [liked, setLiked] = useState(initialWishlistIds);
  const [wishlistLoading, setWishlistLoading] = useState(new Set());

  useEffect(() => {
    setLiked(initialWishlistIds);
  }, [initialWishlistIds]);

  // Cart local feedback
  const [justAdded, setJustAdded] = useState(new Set());
  const [cartVersion, setCartVersion] = useState(0);

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  // Fetch products
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${API_BASE}/products`, {
          signal: controller.signal,
          timeout: 10000
        });

        if (!mounted) return;

        const data = res?.data?.products || [];
        setProducts(data);

        const maxPrice = Math.ceil(Math.max(0, ...data.map((p) => Number(p.price) || 0)));
        setFilters((prev) => ({
          ...prev,
          priceMax: maxPrice || prev.priceMax || 10000,
          priceMin: 0,
          brand: activeBrand,
        }));
      } catch (err) {
        if (axios.isCancel(err) || !mounted) return;
        console.error('Error fetching products:', err);
        setError(err?.response?.data?.error || 'Failed to load products. Please try again later.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []); // Fetch once, filter locally. Brand sync is handled by other effect.

  // Categories
  const categories = useMemo(() => {
    const set = new Set();
    // If a brand is selected, only collect categories from that brand's products
    // Otherwise, collect from all products
    const sourceProducts = activeBrand === 'all'
      ? products
      : products.filter(p => p.brand === activeBrand);

    sourceProducts.forEach((p) => p?.category && set.add(p.category));
    return ['all', ...Array.from(set).sort()];
  }, [products, activeBrand]);

  // Get cart items (memoized)
  const cartItems = useMemo(() => {
    const ctxCart = cartCtx?.cart || [];

    if (Array.isArray(ctxCart) && ctxCart.length > 0) {
      return ctxCart;
    }

    try {
      const ls = JSON.parse(localStorage.getItem('cart') || '[]');
      return Array.isArray(ls) ? ls : [];
    } catch {
      return [];
    }
  }, [cartCtx?.cart, cartVersion]);

  // Helper: Check if product is in cart
  const isInCart = useCallback((pid) => {
    return cartItems.some(item => {
      const itemPid = item?.product?._id || item?.productId || item?._id;
      return itemPid === pid;
    });
  }, [cartItems]);

  // Filter + sort (memoized)
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let arr = [...products];

    // Filter by Brand (Synced with URL)
    if (filters.brand !== 'all') {
      arr = arr.filter((p) => p?.brand === filters.brand);
    }

    if (s) {
      arr = arr.filter((p) => {
        const n = p?.name?.toLowerCase() || '';
        const d = p?.description?.toLowerCase() || '';
        const c = p?.category?.toLowerCase() || '';
        return n.includes(s) || d.includes(s) || c.includes(s);
      });
    }

    if (filters.category !== 'all') {
      arr = arr.filter((p) => p?.category === filters.category);
    }

    arr = arr.filter((p) => {
      const price = Number(p?.price) || 0;
      return price >= (filters.priceMin || 0) && price <= (filters.priceMax || Infinity);
    });

    if (filters.rating > 0) {
      arr = arr.filter((p) => Number(p?.rating || p?.averageRating || 0) >= filters.rating);
    }

    arr.sort((a, b) => {
      const an = (a?.name || '').toLowerCase();
      const bn = (b?.name || '').toLowerCase();
      const ap = Number(a?.price) || 0;
      const bp = Number(b?.price) || 0;
      const ad = new Date(a?.createdAt || 0).getTime();
      const bd = new Date(b?.createdAt || 0).getTime();

      switch (filters.sort) {
        case 'name-desc':
          return bn.localeCompare(an);
        case 'price-asc':
          return ap - bp;
        case 'price-desc':
          return bp - ap;
        case 'newest':
          return bd - ad;
        case 'name-asc':
        default:
          return an.localeCompare(bn);
      }
    });

    return arr;
  }, [products, search, filters]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [search, filters]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!sentinelRef.current || filtered.length <= visibleCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          setVisibleCount((prevCount) => {
            const nextCount = Math.min(filtered.length, prevCount + LOAD_MORE);
            return nextCount;
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(sentinelRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [filtered.length, visibleCount]);

  const visibleProducts = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  // Actions
  const clearAll = useCallback(() => {
    setSearch('');
    // Clear brand from URL
    setSearchParams({});
    setFilters((f) => ({
      brand: 'all',
      category: 'all',
      priceMin: 0,
      priceMax: f.priceMax || 0,
      rating: 0,
      sort: 'name-asc',
    }));
  }, [setSearchParams]);

  const setBrandPill = useCallback((val) => {
    if (val === BRAND_MS) {
      setSearchParams({ brand: 'ms' });
    } else if (val === BRAND_JAKSH) {
      setSearchParams({ brand: 'jaksh' });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const handleToggleLike = useCallback(async (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      showPopup('Please login to add to wishlist', 'info');
      return;
    }

    setWishlistLoading((prev) => new Set(prev).add(id));

    try {
      if (liked.has(id)) {
        const result = await removeFromWishlist(id);
        if (result.success) {
          setLiked((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
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
      setWishlistLoading((prev) => {
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
    const inCartNow = isInCart(pid);
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

      if (cartCtx?.addToCart) {
        await cartCtx.addToCart(product, 1, defaultCustomization);
      } else {
        addToCartLS(product, defaultCustomization);
      }

      setJustAdded((prev) => new Set(prev).add(pid));

      setTimeout(() => {
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
  }, [isInCart, removeProductFromCart, cartCtx, addToCartLS, removeFromCartLS]);

  const handleNavigate = useCallback((pid) => {
    navigate(`/product/${pid}`);
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="products-page">
        <div className="container">
          <div className="hero">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-subtitle" />
          </div>
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="thumb skeleton" />
                <div className="card-body">
                  <div className="skeleton skeleton-line w-70" />
                  <div className="skeleton skeleton-line w-40" />
                  <div className="skeleton skeleton-cta" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="products-page">
        <div className="container">
          <div className="empty">
            <h3>Error loading products</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sortChips = [
    { label: 'Name A-Z', value: 'name-asc' },
    { label: 'Name Z-A', value: 'name-desc' },
    { label: 'Price: Low→High', value: 'price-asc' },
    { label: 'Price: High→Low', value: 'price-desc' },
    { label: 'Newest', value: 'newest' },
  ];

  return (
    <div className="products-page">
      <div className="container">
        {/* Header */}
        <div className="hero">
          <h1>Our Products</h1>
          <p>Explore premium solutions from MS Enterprises and Jaksh</p>
        </div>

        {/* Brand group */}
        <div className="brand-row">
          <div className="brand-group" role="group" aria-label="Filter by brand">
            <button
              type="button"
              onClick={() => setBrandPill('all')}
              className={`brand-btn left ${filters.brand === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setBrandPill(BRAND_MS)}
              className={`brand-btn mid ${filters.brand === BRAND_MS ? 'active' : ''}`}
            >
              {BRAND_MS}
            </button>
            <button
              type="button"
              onClick={() => setBrandPill(BRAND_JAKSH)}
              className={`brand-btn right ${filters.brand === BRAND_JAKSH ? 'active' : ''}`}
            >
              {BRAND_JAKSH}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-row">
          <div className="search-wrap">
            <span className="material-icons search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search for products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search for products"
            />
          </div>
        </div>

        {/* Sort chips + category + clear */}
        <div className="controls-row">
          <div className="chips">
            {sortChips.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`chip-btn ${filters.sort === s.value ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, sort: s.value }))}
              >
                {s.label}
              </button>
            ))}
          </div>

          <CustomDropdown
            options={categories}
            value={filters.category}
            onChange={(val) => setFilters((f) => ({ ...f, category: val }))}
          />

          <button type="button" className="clear-filters" onClick={clearAll}>
            <span className="material-icons mr-1">clear</span>
            Clear All Filters
          </button>
        </div>

        {/* Count */}
        <div className="count-row">
          <p>
            <span className="count-strong">{filtered.length.toLocaleString()}</span> products found
          </p>
        </div>

        {/* Grid */}
        {visibleProducts.length > 0 ? (
          <>
            <div className="grid">
              {visibleProducts.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  isLiked={liked.has(p._id)}
                  isWishlistLoading={wishlistLoading.has(p._id)}
                  inCart={isInCart(p._id)}
                  isAdded={justAdded.has(p._id)}
                  onToggleLike={handleToggleLike}
                  onAddOrRemove={handleAddOrRemove}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} className="grid-sentinel" style={{ height: '20px', margin: '20px 0' }} />
            )}
          </>
        ) : (
          <div className="empty">
            <h3>No products match your filters</h3>
            <p>Try changing brand, category, or clearing the search.</p>
            <button className="btn-primary" onClick={clearAll}>
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;