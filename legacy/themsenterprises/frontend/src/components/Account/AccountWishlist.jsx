// src/components/Account/AccountWishlist.jsx
import React, { useMemo, useState } from 'react';
import { FiHeart, FiTrash2, FiSearch, FiCheckSquare, FiSquare } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import './AccountWishlist.css';

const AccountWishlist = ({
  wishlist = [],
  loading,
  error,
  handleRemoveFromWishlist,
  handleMoveToCart,
}) => {
  // Toolbar state
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState('name-asc');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [removeId, setRemoveId] = useState(null); // for single remove confirm
  const [showBulkRemove, setShowBulkRemove] = useState(false);
  const [bulkRemoving, setBulkRemoving] = useState(false);

  const brands = useMemo(() => {
    const set = new Set();
    wishlist.forEach((p) => p?.brand && set.add(p.brand));
    return ['all', ...Array.from(set)];
  }, [wishlist]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = wishlist.filter((p) => {
      const matchesQuery =
        !q ||
        p?.name?.toLowerCase().includes(q) ||
        p?.brand?.toLowerCase().includes(q);
      const matchesBrand = brand === 'all' || p?.brand === brand;
      return matchesQuery && matchesBrand;
    });

    switch (sort) {
      case 'price-asc':
        arr = arr.slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price-desc':
        arr = arr.slice().sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'name-desc':
        arr = arr.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).reverse();
        break;
      case 'name-asc':
      default:
        arr = arr.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    return arr;
  }, [wishlist, query, brand, sort]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p._id));
  const selectedCount = selectedIds.size;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((p) => next.delete(p._id));
      } else {
        filtered.forEach((p) => next.add(p._id));
      }
      return next;
    });
  };

  const moveSelectedToCart = async () => {
    for (const p of filtered) {
      if (selectedIds.has(p._id)) {
        await Promise.resolve(handleMoveToCart?.(p));
      }
    }
    // Keep items selected; user may remove next if they want
  };

  const confirmRemove = async (id) => {
    await Promise.resolve(handleRemoveFromWishlist?.(id));
    setRemoveId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const confirmBulkRemove = async () => {
    try {
      setBulkRemoving(true);
      for (const id of Array.from(selectedIds)) {
        await Promise.resolve(handleRemoveFromWishlist?.(id));
      }
      setSelectedIds(new Set());
    } finally {
      setBulkRemoving(false);
      setShowBulkRemove(false);
    }
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="account-section account-wishlist">
        <h2 className="aw-title">My Wishlist</h2>
        <div className="aw-toolbar skeleton-toolbar">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-line short" />
        </div>
        <div className="aw-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aw-card skeleton">
              <div className="aw-img skeleton-anim" />
              <div className="aw-body">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-pill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="account-section account-wishlist">
        <h2 className="aw-title">My Wishlist</h2>
        <div className="aw-error">{error}</div>
      </div>
    );
  }

  // Empty state
  if (!filtered?.length && !query && (brand === 'all' || brands.length <= 1)) {
    return (
      <div className="account-section account-wishlist">
        <h2 className="aw-title">My Wishlist</h2>
        <div className="aw-empty">
          <div className="aw-empty-icon">
            <FiHeart />
          </div>
          <h3>Your wishlist is empty</h3>
          <p>Add products you like to see them here</p>
          <a className="aw-cta" href="/products">Browse Products</a>
        </div>
      </div>
    );
  }

  return (
    <div className="account-section account-wishlist">
      <h2 className="aw-title">My Wishlist</h2>

      {/* Toolbar */}
      <div className="aw-toolbar">
        <div className="aw-search">
          <FiSearch className="aw-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="aw-input"
            placeholder="Search your wishlist..."
            aria-label="Search wishlist"
          />
        </div>

        <div className="aw-selects">
          <select
            className="aw-select"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by brand"
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b === 'all' ? 'All brands' : b}
              </option>
            ))}
          </select>

          <select
            className="aw-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort wishlist"
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>

        <div className="aw-bulk-actions">
          <button
            type="button"
            className="aw-btn aw-btn-ghost"
            onClick={toggleSelectAllVisible}
            aria-pressed={allVisibleSelected}
          >
            {allVisibleSelected ? <FiCheckSquare /> : <FiSquare />}
            {allVisibleSelected ? 'Unselect all' : 'Select all'}
          </button>

          <button
            type="button"
            className="aw-btn aw-btn-primary"
            onClick={moveSelectedToCart}
            disabled={selectedCount === 0}
            title={selectedCount === 0 ? 'Select items first' : 'Move selected to cart'}
          >
            Move selected to cart
          </button>

          <button
            type="button"
            className="aw-btn aw-btn-danger"
            onClick={() => setShowBulkRemove(true)}
            disabled={selectedCount === 0}
            title={selectedCount === 0 ? 'Select items first' : 'Remove selected'}
          >
            Remove selected
          </button>

          {selectedCount > 0 && (
            <span className="aw-selected-count">{selectedCount} selected</span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="aw-grid">
        {filtered.map((product) => {
          const price = Number(product?.price ?? 0);
          const img = product?.images?.[0] || '/logo.png';
          const customizable =
            !!product?.customizationOptions &&
            (product.customizationOptions.allowsImageUpload ||
              (Array.isArray(product.customizationOptions.availableSizes) &&
                product.customizationOptions.availableSizes.length > 0));

          const isSelected = selectedIds.has(product._id);

          return (
            <div key={product._id} className={`aw-card ${isSelected ? 'selected' : ''}`}>
              {/* Select checkbox */}
              <button
                type="button"
                className="aw-check"
                aria-pressed={isSelected}
                aria-label={isSelected ? 'Unselect item' : 'Select item'}
                onClick={() => toggleSelect(product._id)}
                title={isSelected ? 'Unselect' : 'Select'}
              >
                {isSelected ? <FiCheckSquare /> : <FiSquare />}
              </button>

              {/* Image */}
              <div className="aw-img">
                <img src={img} alt={product?.name || 'Product'} loading="lazy" decoding="async" />
                <div className="aw-badges">
                  {customizable && <span className="aw-badge aw-badge-custom">Customizable</span>}
                  {product?.brand && <span className="aw-badge">{product.brand}</span>}
                </div>
              </div>

              {/* Body */}
              <div className="aw-body">
                <h4 className="aw-name" title={product?.name}>{product?.name}</h4>
                <div className="aw-meta">
                  <span className="aw-price">₹{price.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="aw-actions">
                <button
                  type="button"
                  className="aw-btn aw-btn-primary aw-full"
                  onClick={() => handleMoveToCart?.(product)}
                  aria-label="Move to cart"
                >
                  Move to Cart
                </button>
                <button
                  type="button"
                  className="aw-icon-btn aw-btn-danger"
                  onClick={() => setRemoveId(product._id)}
                  aria-label="Remove from wishlist"
                  title="Remove"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm remove (single) */}
      <ConfirmModal
        open={!!removeId}
        title="Remove from Wishlist"
        message="Are you sure you want to remove this item from your wishlist?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => confirmRemove(removeId)}
        onCancel={() => setRemoveId(null)}
      />

      {/* Confirm remove (bulk) */}
      <ConfirmModal
        open={showBulkRemove}
        title="Remove Selected Items"
        message={`${selectedCount} item(s) will be removed from your wishlist.`}
        confirmLabel={bulkRemoving ? 'Removing…' : 'Remove Selected'}
        cancelLabel="Cancel"
        variant="danger"
        loading={bulkRemoving}
        onConfirm={confirmBulkRemove}
        onCancel={() => setShowBulkRemove(false)}
      />
    </div>
  );
};

export default AccountWishlist;