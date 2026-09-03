import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiEye, FiStar, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import './ProductCard.css';

import { PopupContext } from '../../context/PopupContext';

const ProductCard = ({ product, viewMode = 'grid' }) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const { addToCart, isInCart, removeFromCart } = useCart();
  const { showPopup } = useContext(PopupContext);
  const { user, addToWishlist, removeFromWishlist } = useAuth();

  const isProductInCart = isInCart(product._id, {});

  const handleRemoveFromCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromCart(product._id, {});
  };

  useEffect(() => {
    if (user && user.wishlist) {
      setIsWishlisted(user.wishlist.some(item => item.toString() === product._id));
    }
  }, [user, product._id]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      return showPopup('Please login to add to wishlist', 'info');
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        const result = await removeFromWishlist(product._id);
        if (result.success) {
        showPopup(result.error, 'error');
        }
      } else {
        const result = await addToWishlist(product._id);
        if (result.success) {
          setIsWishlisted(true);
        } else {
          showPopup(result.error, 'error');
        }
      }
    } catch (error) {
      showPopup('Failed to update wishlist', 'error');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement quick view modal
    console.log('Quick view:', product.name);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FiStar key={i} className="star filled" />);
    }

    if (hasHalfStar) {
      stars.push(<FiStar key="half" className="star half" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FiStar key={`empty-${i}`} className="star empty" />);
    }

    return stars;
  };

  const discountPercentage = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : 0;

  if (viewMode === 'list') {
    return (
      <div className="product-card product-card--list">
        <div className="product-card__image">
          <Link to={`/product/${product._id}`}>
            {!imageError ? (
              <img
                src={product.images[0] || '/api/placeholder/300/300'}
                alt={product.name}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={imageLoaded ? 'loaded' : ''}
              />
            ) : (
              <div className="image-placeholder">
                <span>No Image</span>
              </div>
            )}
          </Link>

          {product.isNew && <span className="badge badge--new">New</span>}
          {product.isBestSeller && (
            <span className="badge badge--bestseller">Best Seller</span>
          )}
          {discountPercentage > 0 && (
            <span className="badge badge--discount">
              -{discountPercentage}%
            </span>
          )}
        </div>

        <div className="product-card__content">
          <div className="product-card__header">
            <Link
              to={`/product/${product._id}`}
              className="product-card__title"
            >
              <h3>{product.name}</h3>
            </Link>
            <div className="product-card__rating">
              <div className="stars">{renderStars(product.rating)}</div>
              <span className="rating-text">({product.reviewCount})</span>
            </div>
          </div>

          <p className="product-card__description">{product.description}</p>

          <div className="product-card__meta">
            <span className="product-card__category">{product.category}</span>
            <span className="product-card__brand">{product.brand}</span>
            {product.isCustomizable && (
              <span className="product-card__customizable">Customizable</span>
            )}
          </div>

          <div className="product-card__footer">
            <div className="product-card__price">
              <span className="price-current">
                ₹{product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="price-original">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            <div className="product-card__actions">
              <button
                className="btn btn--secondary"
                onClick={handleQuickView}
                title="Quick View"
              >
                <FiEye />
              </button>

              <button
                className="btn btn--secondary"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                title={
                  isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'
                }
              >
                <FiHeart className={isWishlisted ? 'wishlisted' : ''} />
              </button>

              <button
                className="btn btn--primary"
                onClick={isProductInCart ? handleRemoveFromCart : handleAddToCart}
                disabled={product.stock === 0}
              >
                {isProductInCart ? <FiTrash2 /> : <FiShoppingCart />}
                {product.stock === 0 ? 'Out of Stock' : (isProductInCart ? 'Remove from Cart' : 'Add to Cart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="product-card">
      <div className="product-card__image">
        <Link to={`/product/${product._id}`}>
          {!imageError ? (
            <img
              src={product.images[0] || '/api/placeholder/300/300'}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={imageLoaded ? 'loaded' : ''}
            />
          ) : (
            <div className="image-placeholder">
              <span>No Image</span>
            </div>
          )}
        </Link>

        <div className="product-card__actions-overlay">
          <button
            className="btn btn--secondary btn--small"
            onClick={handleQuickView}
            title="Quick View"
          >
            <FiEye />
          </button>

          <button
            className="btn btn--secondary btn--small"
            onClick={handleWishlistToggle}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <FiHeart className={isWishlisted ? 'wishlisted' : ''} />
          </button>
        </div>

        {/* Add category tag */}
        <span className="badge badge--category">{product.category}</span>
        <span className="badge badge--brand">{product.brand}</span>

        {product.isNew && <span className="badge badge--new">New</span>}
        {product.isBestSeller && (
          <span className="badge badge--bestseller">Best Seller</span>
        )}
        {discountPercentage > 0 && (
          <span className="badge badge--discount">-{discountPercentage}%</span>
        )}
      </div>

      <div className="product-card__content">
        <Link to={`/product/${product._id}`} className="product-card__title">
          <h3>{product.name}</h3>
        </Link>

        <div className="product-card__rating">
          <div className="stars">{renderStars(product.rating)}</div>
          <span className="rating-text">({product.reviewCount})</span>
        </div>

        <p className="product-card__description">{product.description}</p>

        <div className="product-card__meta">
          <span className="product-card__category">{product.category}</span>
          {product.isCustomizable && (
            <span className="product-card__customizable">Customizable</span>
          )}
        </div>

        <div className="product-card__footer">
          <div className="product-card__price">
            <span className="price-current">
              ₹{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="price-original">
                ₹{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <button
            className="btn btn--primary btn--full"
            onClick={isProductInCart ? handleRemoveFromCart : handleAddToCart}
            disabled={product.stock === 0}
          >
            {isProductInCart ? <FiTrash2 /> : <FiShoppingCart />}
            {product.stock === 0 ? 'Out of Stock' : (isProductInCart ? 'Remove from Cart' : 'Add to Cart')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
