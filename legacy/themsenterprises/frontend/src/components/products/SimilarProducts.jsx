import { useState, useEffect } from 'react';
import { FiShoppingCart, FiHeart } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from './ProductCard';
import { API_BASE } from '../../constants/api';
import './SimilarProducts.css';

const SimilarProducts = ({ currentProduct }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentProduct) {
      fetchSimilarProducts();
    }
  }, [currentProduct]);

  const fetchSimilarProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get products from the same category, excluding current product
      const response = await axios.get(`${API_BASE}/products`, {
        params: {
          category: currentProduct.category,
          brand: currentProduct.brand,
          limit: 8
        }
      });

      // Filter out the current product and limit to 4 products
      const filteredProducts = response.data.products
        .filter(product => product._id !== currentProduct._id)
        .slice(0, 4);

      setSimilarProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching similar products:', error);
      setError('Failed to load similar products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="similar-products">
        <h2>You Might Also Like</h2>
        <div className="loading-grid">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="product-skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-price"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || similarProducts.length === 0) {
    return null; // Don't show section if no similar products or error
  }

  return (
    <div className="similar-products">
      <div className="section-header">
        <h2>You Might Also Like</h2>
        <Link
          to={`/products?category=${encodeURIComponent(currentProduct.category)}&brand=${currentProduct.brand.replace(' ', '').toLowerCase()}`}
          className="view-all-link"
        >
          View All
        </Link>
      </div>

      <div className="similar-products-grid">
        {similarProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            viewMode="grid"
          />
        ))}
      </div>
    </div>
  );
};

export default SimilarProducts;
