// src/components/layout/Header.jsx
import { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { FiMenu, FiX, FiShoppingCart, FiSearch, FiHeart, FiUser, FiShoppingBag, FiPackage, FiLoader } from 'react-icons/fi';
import { useDebounce } from '../../hooks/useDebounce';
import { API_BASE } from '../../constants/api';
import './Header.css';

const PLACEHOLDER_IMG = '/logo.png';

import { useMediaQuery } from '../../hooks/useMediaQuery';

// Move SearchBar component outside to prevent recreation
const SearchBar = ({ 
  searchQuery, 
  onSearchChange, 
  onSearchFocus, 
  searchResults, 
  showDropdown, 
  isLoading, 
  onResultClick, 
  containerRef,
  isMobile = false 
}) => (
  <div className={`search-bar ${isMobile ? 'search-bar--mobile' : ''}`} ref={containerRef}>
    <FiSearch className="search-icon" />
    <input
      type="text"
      placeholder="Search for products..."
      className="search-input"
      value={searchQuery}
      onChange={onSearchChange}
      onFocus={onSearchFocus}
      autoComplete="off"
    />
    {showDropdown && searchQuery.length > 0 && (
      <div className="search-dropdown" role="listbox">
        {isLoading ? (
          <div className="search-feedback search-loading">
            <FiLoader className="loading-spinner" />
            <span>Searching...</span>
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((product) => (
            <div 
              key={product._id} 
              className="search-result-item" 
              onClick={() => onResultClick(product._id)}
            >
              <div className="search-result-img-wrapper">
                <img 
                  src={product.images?.[0] || PLACEHOLDER_IMG} 
                  alt={product.name} 
                  className="search-result-img" 
                />
              </div>
              <span className="search-result-name">{product.name}</span>
            </div>
          ))
        ) : (
          <div className="search-feedback search-empty">
            <FiSearch className="empty-icon" />
            <span>No products found</span>
            <p className="empty-subtext">Try searching with different keywords</p>
          </div>
        )}
      </div>
    )}
  </div>
);

const Header = () => {
  const isTabletOrLarger = useMediaQuery('(min-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 424px)');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileSearchVisible, setMobileSearchVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const { user } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);

  useEffect(() => {
    setAnimationKey(prevKey => prevKey + 1);
  }, [location.pathname]);

  const isHomePage = location.pathname === '/';
  const isProductsPage = location.pathname.startsWith('/products');
  const isProductDetailPage = location.pathname.startsWith('/product/');
  const isSimplifiedHeaderPage = useMemo(() => {
    const simplifiedRoutes = isTabletOrLarger
      ? ['/login', '/register']
      : ['/login', '/register', '/terms', '/privacy'];
    return simplifiedRoutes.includes(location.pathname);
  }, [location.pathname, isTabletOrLarger]);

  const cartItemCount = useMemo(() => cart?.length || 0, [cart]);
  const wishlistCount = useMemo(() => user?.wishlist?.length || 0, [user]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (debouncedQuery.length > 0) {
      fetchSearchResults(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target) &&
          mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSearchResults = async (query) => {
    setIsLoading(true);
    try {
      const { success, products } = await (await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`)).json();
      if (success) {
        setSearchResults(products || []);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = useCallback((productId) => {
    navigate(`/product/${productId}`);
    setShowDropdown(false);
    setSearchQuery('');
    closeMobileMenu();
  }, [navigate]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  }, [searchResults.length]);

  const MobileVisibleNav = () => {
    if (isSimplifiedHeaderPage) {
      return <div className="spacer"></div>;
    }
    if (isHomePage) {
      return (
        <div className="mobile-visible-nav">
          <NavLink to="/products" className="header-link icon-link"><FiShoppingBag /> {isSmallMobile ? 'Products' : 'All Products'}</NavLink>
          {isTabletOrLarger && (
            <>
              <NavLink to="/account" state={{ section: 'wishlist' }} className="header-link icon-link">
                <FiHeart />
                <span className="header-link-text">Wishlist</span>
                {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
              </NavLink>
              <NavLink to="/cart" className="header-link icon-link">
                <FiShoppingCart />
                <span className="header-link-text">Cart</span>
                {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
              </NavLink>
            </>
          )}
          <NavLink to="/account" className="header-link icon-link"><FiUser /> {isSmallMobile ? 'Account' : 'My Account'}</NavLink>
        </div>
      );
    }
    if (isProductsPage || isProductDetailPage) {
      return (
        <div className={`mobile-visible-nav products-nav ${isTabletOrLarger ? 'tablet-spacing' : ''}`}>
          <div className="spacer"></div>
          <NavLink to="/account" state={{ section: 'wishlist' }} className="header-link icon-link">
            <FiHeart />
            {isTabletOrLarger && <span className="header-link-text">Wishlist</span>}
            {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
          </NavLink>
          <NavLink to="/cart" className="header-link icon-link">
            <FiShoppingCart />
            {isTabletOrLarger && <span className="header-link-text">Cart</span>}
            {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
          </NavLink>
          <NavLink to="/account" className="header-link icon-link"><FiUser /> {isSmallMobile ? 'Account' : 'My Account'}</NavLink>
        </div>
      );
    }
    if (location.pathname === '/account' || location.pathname === '/cart' || location.pathname === '/wishlist' || location.pathname === '/checkout' || location.pathname.startsWith('/payment')) {
      return (
        <div className={`mobile-visible-nav account-nav ${isTabletOrLarger ? 'tablet-spacing' : ''}`}>
          <div className="spacer"></div>
          <NavLink to="/cart" className="header-link icon-link">
            <FiShoppingCart />
            <span className="header-link-text">Cart</span>
            {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
          </NavLink>
          <Link to="/account" state={{ section: 'wishlist' }} className="header-link icon-link">
            <FiHeart />
            <span className="header-link-text">Wishlist</span>
            {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
          </Link>
          <Link to="/account" state={{ section: 'orders' }} className="header-link icon-link">
            <FiPackage /> Orders
          </Link>
        </div>
      );
    }
    return null;
  };

  const MobileDropdownNav = () => (
    <nav className="mobile-nav" aria-label="Mobile">
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchFocus={handleSearchFocus}
        searchResults={searchResults}
        showDropdown={showDropdown}
        isLoading={isLoading}
        onResultClick={handleResultClick}
        containerRef={mobileSearchContainerRef}
        isMobile={true}
      />
      <NavLink to="/" className="mobile-nav-link" onClick={closeMobileMenu}>Home</NavLink>
      <NavLink to="/products" className="mobile-nav-link" onClick={closeMobileMenu}>All Products</NavLink>
      <NavLink to="/cart" className="mobile-nav-link" onClick={closeMobileMenu}>Cart</NavLink>
      <NavLink to="/account" state={{ section: 'wishlist' }} className="mobile-nav-link" onClick={closeMobileMenu}>Wishlist</NavLink>
      {user ? (
        <NavLink to="/account" end className="mobile-nav-link" onClick={closeMobileMenu}>My Account</NavLink>
      ) : (
        <NavLink to="/login" className="mobile-nav-link" onClick={closeMobileMenu}>Sign In</NavLink>
      )}
    </nav>
  );

  return (
    <header className={`header ${isHomePage ? 'is-home-page' : ''} ${isSimplifiedHeaderPage ? 'is-simplified-header-page' : ''}`}>
      <div className="header-container" key={animationKey}>
        <div className="header-left">
          <Link to="/" className="logo-link" onClick={closeMobileMenu}>
            <img src="/logo.png" alt="MS Enterprises Logo" className="logo-img" />
            <span className="logo-text">MS Enterprises</span>
          </Link>
        </div>

        {isSimplifiedHeaderPage ? null : <div className="header-center">
          <SearchBar 
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchFocus={handleSearchFocus}
            searchResults={searchResults}
            showDropdown={showDropdown}
            isLoading={isLoading}
            onResultClick={handleResultClick}
            containerRef={searchContainerRef}
          />
        </div>}

        {isSimplifiedHeaderPage ? null : <nav className="header-right" aria-label="Primary">
          <NavLink to="/products" className="header-link icon-link"><FiShoppingBag /> All Products</NavLink>
          <Link to="/account" state={{ section: 'wishlist' }} className="header-link icon-link">
            <FiHeart />
            <span className="header-link-text">Wishlist</span>
            {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
          </Link>
          <NavLink to="/cart" className="header-link icon-link">
            <FiShoppingCart />
            <span className="header-link-text">Cart</span>
            {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
          </NavLink>
          {user ? (
<NavLink to="/account" end className="header-link icon-link"><FiUser /> My Account</NavLink>
          ) : (
            <NavLink to="/login" className="header-link">Sign In</NavLink>
          )}
        </nav>}

        <div className="mobile-header-right">
          <MobileVisibleNav />
          <div className="mobile-menu-container">
            <button onClick={toggleMobileMenu} className="mobile-menu-button" aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}>
              {isMobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && <MobileDropdownNav />}
    </header>
  );
};

export default Header;