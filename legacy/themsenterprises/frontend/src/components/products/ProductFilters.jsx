import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import './ProductFilters.css';

const ProductFilters = ({ filters, onFilterChange, categories, maxPrice }) => {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    customization: true,
    rating: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...filters,
      category: filters.category === category ? '' : category,
    });
  };

  const handlePriceChange = (value) => {
    onFilterChange({
      ...filters,
      priceRange: [0, parseInt(value)],
    });
  };

  const handleCustomizationChange = (customization) => {
    onFilterChange({
      ...filters,
      customization:
        filters.customization === customization ? '' : customization,
    });
  };

  const handleRatingChange = (rating) => {
    onFilterChange({
      ...filters,
      rating: filters.rating === rating ? 0 : rating,
    });
  };

  const handleSortChange = (sortBy, sortOrder) => {
    onFilterChange({
      ...filters,
      sortBy,
      sortOrder,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category: '',
      priceRange: [0, maxPrice],
      customization: '',
      rating: 0,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  };

  const hasActiveFilters =
    filters.category ||
    filters.customization ||
    filters.rating > 0 ||
    filters.priceRange[1] < maxPrice;

  return (
    <div className="product-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="clear-all-btn">
            <FiX />
            Clear All
          </button>
        )}
      </div>

      {/* Sort Options */}
      <div className="filter-section">
        <div
          className="filter-section-header"
          onClick={() => toggleSection('sort')}
        >
          <h4>Sort By</h4>
        </div>
        <div className="filter-section-content">
          <div className="sort-options">
            <label className="sort-option">
              <input
                type="radio"
                name="sortBy"
                checked={filters.sortBy === 'name'}
                onChange={() => handleSortChange('name', 'asc')}
              />
              Name A-Z
            </label>
            <label className="sort-option">
              <input
                type="radio"
                name="sortBy"
                checked={
                  filters.sortBy === 'price' && filters.sortOrder === 'asc'
                }
                onChange={() => handleSortChange('price', 'asc')}
              />
              Price: Low to High
            </label>
            <label className="sort-option">
              <input
                type="radio"
                name="sortBy"
                checked={
                  filters.sortBy === 'price' && filters.sortOrder === 'desc'
                }
                onChange={() => handleSortChange('price', 'desc')}
              />
              Price: High to Low
            </label>
            <label className="sort-option">
              <input
                type="radio"
                name="sortBy"
                checked={filters.sortBy === 'rating'}
                onChange={() => handleSortChange('rating', 'desc')}
              />
              Highest Rated
            </label>
            <label className="sort-option">
              <input
                type="radio"
                name="sortBy"
                checked={filters.sortBy === 'newest'}
                onChange={() => handleSortChange('newest', 'desc')}
              />
              Newest First
            </label>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="filter-section">
        <div
          className="filter-section-header"
          onClick={() => toggleSection('category')}
        >
          <h4>Category</h4>
          {expandedSections.category ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.category && (
          <div className="filter-section-content">
            <div className="filter-options">
              {categories.map((category) => (
                <label key={category} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.category === category}
                    onChange={() => handleCategoryChange(category)}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Filter */}
      <div className="filter-section">
        <div
          className="filter-section-header"
          onClick={() => toggleSection('price')}
        >
          <h4>Price Range</h4>
          {expandedSections.price ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.price && (
          <div className="filter-section-content">
            <div className="price-range">
              <input
                type="range"
                min="0"
                max={maxPrice}
                value={filters.priceRange[1]}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="price-slider"
              />
              <div className="price-labels">
                <span>₹0</span>
                <span>₹{filters.priceRange[1].toLocaleString()}</span>
                <span>₹{maxPrice.toLocaleString()}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customization Filter */}
      <div className="filter-section">
        <div
          className="filter-section-header"
          onClick={() => toggleSection('customization')}
        >
          <h4>Customization</h4>
          {expandedSections.customization ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.customization && (
          <div className="filter-section-content">
            <div className="filter-options">
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.customization === 'customizable'}
                  onChange={() => handleCustomizationChange('customizable')}
                />
                Customizable
              </label>
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.customization === 'non-customizable'}
                  onChange={() => handleCustomizationChange('non-customizable')}
                />
                Non-customizable
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="filter-section">
        <div
          className="filter-section-header"
          onClick={() => toggleSection('rating')}
        >
          <h4>Minimum Rating</h4>
          {expandedSections.rating ? <FiChevronUp /> : <FiChevronDown />}
        </div>
        {expandedSections.rating && (
          <div className="filter-section-content">
            <div className="rating-options">
              {[4, 3, 2, 1].map((rating) => (
                <label key={rating} className="rating-option">
                  <input
                    type="checkbox"
                    checked={filters.rating === rating}
                    onChange={() => handleRatingChange(rating)}
                  />
                  <div className="rating-display">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`star ${i < rating ? 'filled' : 'empty'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="rating-label">{rating}+ Stars</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFilters;
