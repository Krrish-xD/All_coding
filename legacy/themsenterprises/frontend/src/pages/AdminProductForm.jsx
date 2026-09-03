import React, { useState, useEffect, useContext } from 'react';
import httpClient from '../services/httpClient';
import { FiPlus, FiX, FiTrash2, FiEdit, FiImage, FiPackage, FiTag, FiStar, FiSliders, FiCheck } from 'react-icons/fi';
import { useFormDirty } from '../components/AdminLayout';
import './AdminProductForm.css';

// ============== CONFIRM MODAL COMPONENT ==============
const ConfirmModal = ({ show, onConfirm, onCancel, message }) => {
  if (!show) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ============== CUSTOMIZATION MODAL COMPONENT ==============
const CustomizationModal = ({ show, onClose, newCustomization, updateNewCustomization, updateNewCustomizationPriceModifier, addNewCustomizationOption, updateNewCustomizationOption, removeNewCustomizationOption, createOrUpdateCustomization, editingLocalIndex }) => {
  if (!show) return null;
  return (
    <div className="confirm-overlay">
      <div className="customization-modal">
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-icon">
              <FiSliders />
            </div>
            <div>
              <h3>{editingLocalIndex !== null ? 'Edit Customization' : 'Create New Customization'}</h3>
              <p className="modal-subtitle">Configure product customization options</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="create-customization-form">
          {/* Basic Info Section */}
          <div className="modal-section">
            <div className="modal-section-header">
              <h4>Basic Information</h4>
            </div>
            <div className="modal-form-grid">
              <div className="form-group">
                <label>Customization Name *</label>
                <input
                  type="text"
                  value={newCustomization.name}
                  onChange={(e) => updateNewCustomization('name', e.target.value)}
                  className="form-input"
                  placeholder="e.g., Extra Cheese, Size, Color"
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={newCustomization.type}
                  onChange={(e) => updateNewCustomization('type', e.target.value)}
                  className="form-select"
                >
                  <option value="boolean">Boolean (Yes/No)</option>
                  <option value="select">Single Select</option>
                  <option value="multi-select">Multi-Select</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                value={newCustomization.description}
                onChange={(e) => updateNewCustomization('description', e.target.value)}
                className="form-textarea"
                placeholder="Add a helpful description for this customization"
                rows="3"
              />
            </div>
          </div>

          {/* Price Modifier for Boolean */}
          {newCustomization.type === 'boolean' && (
            <div className="modal-section">
              <div className="modal-section-header">
                <h4>Price Modifier</h4>
                <span className="section-badge">Boolean Type</span>
              </div>
              <div className="price-modifier-card">
                <div className="price-modifier-inputs">
                  <div className="form-group">
                    <label>Operation</label>
                    <select
                      value={newCustomization.priceModifier.operator}
                      onChange={(e) => updateNewCustomizationPriceModifier('operator', e.target.value)}
                      className="form-select"
                    >
                      <option value="+">Add (+)</option>
                      <option value="-">Subtract (-)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      value={newCustomization.priceModifier.value}
                      onChange={(e) => updateNewCustomizationPriceModifier('value', Number(e.target.value))}
                      placeholder="0.00"
                      className="form-input"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="price-preview">
                  <span className="preview-label">Preview:</span>
                  <span className="preview-value">
                    Base Price {newCustomization.priceModifier.operator} ${newCustomization.priceModifier.value}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Options for Select/Multi-select */}
          {(newCustomization.type === 'select' || newCustomization.type === 'multi-select') && (
            <div className="modal-section">
              <div className="modal-section-header">
                <h4>Customization Options</h4>
                <span className="section-badge">
                  {newCustomization.type === 'select' ? 'Single Select' : 'Multi-Select'}
                </span>
              </div>
              {newCustomization.options.length === 0 ? (
                <div className="empty-options-state">
                  <FiPlus size={32} />
                  <p>No options added yet</p>
                  <span>Click "Add Option" below to create customization options</span>
                </div>
              ) : (
                <div className="options-list">
                  {newCustomization.options.map((option, index) => (
                    <div key={index} className="option-card">
                      <div className="option-number">{index + 1}</div>
                      <div className="option-content">
                        <div className="form-group">
                          <label>Option Name</label>
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) => updateNewCustomizationOption(index, 'value', e.target.value)}
                            placeholder="e.g., Small, Medium, Large"
                            className="form-input"
                          />
                        </div>
                        <div className="option-pricing">
                          <div className="form-group">
                            <label>Operation</label>
                            <select
                              value={option.priceModifier.operator}
                              onChange={(e) => updateNewCustomizationOption(index, 'operator', e.target.value)}
                              className="form-select"
                            >
                              <option value="+">+</option>
                              <option value="-">-</option>
                            </select>
                          </div>
                        <div className="form-group">
                          <label>Price (₹)</label>
                          <input
                            type="number"
                            value={option.priceModifier.value}
                            onChange={(e) => updateNewCustomizationOption(index, 'priceValue', Number(e.target.value))}
                            placeholder="0.00"
                            className="form-input"
                            step="0.01"
                          />
                        </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="option-remove-btn"
                        onClick={() => removeNewCustomizationOption(index)}
                        title="Remove option"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={addNewCustomizationOption}
              >
                <FiPlus /> Add Option
              </button>
            </div>
          )}

          {/* Settings Section */}
          <div className="modal-section">
            <div className="modal-section-header">
              <h4>Settings</h4>
            </div>
            <div className="settings-group">
              <label className="checkbox-label-enhanced">
                <input
                  type="checkbox"
                  checked={newCustomization.isDefault}
                  onChange={(e) => updateNewCustomization('isDefault', e.target.checked)}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Set as Default</span>
                  <span className="checkbox-description">This customization will be pre-selected for new products</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <FiX /> Cancel
            </button>
            <button type="button" className="btn btn-primary btn-large" onClick={createOrUpdateCustomization}>
              <FiCheck /> {editingLocalIndex !== null ? 'Update' : 'Create'} Customization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { PopupContext } from '../context/PopupContext';

const AdminProductForm = ({ editingProduct, onSave, onCancel }) => {
  const { setIsFormDirty } = useFormDirty();

  const { showPopup } = useContext(PopupContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    brand: 'MS Enterprises',
    category: '',
    stock: '',
    images: [],
    customizations: [],
    reviews: [],
    tags: []
  });

  const [availableCustomizations, setAvailableCustomizations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [imageToRemove, setImageToRemove] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [removedImage, setRemovedImage] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [tagToDeleteIndex, setTagToDeleteIndex] = useState(null);
  const [showTagUndoToast, setShowTagUndoToast] = useState(false);
  const [removedTag, setRemovedTag] = useState(null);
  const [removedTagIndex, setRemovedTagIndex] = useState(null);
  const [existingReviews, setExistingReviews] = useState([]);
  const [reviewToRemoveIndex, setReviewToRemoveIndex] = useState(null);
  const [removedReview, setRemovedReview] = useState(null);
  const [showReviewRemoveUndoToast, setShowReviewRemoveUndoToast] = useState(false);
  const [deletedReview, setDeletedReview] = useState(null);
  const [showReviewDeleteUndoToast, setShowReviewDeleteUndoToast] = useState(false);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [newCustomization, setNewCustomization] = useState({
    name: '',
    type: 'boolean',
    description: '',
    priceModifier: { type: 'fixed', operator: '+', value: 0 },
    options: [],
    isDefault: false,
    isActive: true
  });
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [editingLocalIndex, setEditingLocalIndex] = useState(null);

  // Load customizations
  useEffect(() => {
    (async () => {
      try {
        const res = await httpClient.get('/customizations');
        setAvailableCustomizations(res.data.customizations);
      } catch (err) {
        console.error('Failed to load customizations', err);
      }
    })();
  }, []);

  // Load existing reviews
  useEffect(() => {
    if (editingProduct?._id) {
      (async () => {
        try {
          const res = await httpClient.get(`/reviews/product/${editingProduct._id}`);
          setExistingReviews(res.data.reviews);
        } catch (err) {
          console.error('Failed to load reviews', err);
        }
      })();
    } else {
      setExistingReviews([]);
    }
  }, [editingProduct]);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const res = await httpClient.get('/admin2009/products');
        const uniqueCategories = [...new Set(res.data.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    })();
  }, []);

  // Auto-hide undo toasts
  useEffect(() => {
    if (showUndoToast) {
      const timer = setTimeout(() => setShowUndoToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showUndoToast]);

  useEffect(() => {
    if (showTagUndoToast) {
      const timer = setTimeout(() => setShowTagUndoToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showTagUndoToast]);

  useEffect(() => {
    if (showReviewRemoveUndoToast) {
      const timer = setTimeout(() => setShowReviewRemoveUndoToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showReviewRemoveUndoToast]);

  useEffect(() => {
    if (showReviewDeleteUndoToast) {
      const timer = setTimeout(() => setShowReviewDeleteUndoToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showReviewDeleteUndoToast]);

  // Populate on edit
  useEffect(() => {
    if (editingProduct) {
      const enabledCustomizations = editingProduct.customizations?.filter(c => c.enabled) || [];
      setFormData({
        ...editingProduct,
        price: editingProduct.price.toString(),
        stock: editingProduct.stock.toString(),
        images: editingProduct.images || [],
        customizations: enabledCustomizations,
        reviews: [],
        tags: editingProduct.tags || []
      });
    } else {
      // Reset for new product
      setFormData({
        name: '',
        description: '',
        price: '',
        brand: 'MS Enterprises',
        category: '',
        stock: '',
        images: [],
        customizations: [],
        reviews: [],
        tags: []
      });
    }
  }, [editingProduct]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setHasUnsavedChanges(true);
  };

  // Tags
  const addTag = () => setFormData({ ...formData, tags: [...formData.tags, ''] });
  const updateTag = (i, val) => {
    const tags = [...formData.tags];
    tags[i] = val;
    setFormData({ ...formData, tags });
  };

  const openTagDeleteConfirmation = (i) => {
    setConfirmAction('deleteTag');
    setConfirmMessage('Delete this tag?');
    setTagToDeleteIndex(i);
    setShowConfirmModal(true);
  };

  const confirmTagDelete = () => {
    if (tagToDeleteIndex !== null) {
      const removed = formData.tags[tagToDeleteIndex];
      setRemovedTag(removed);
      setRemovedTagIndex(tagToDeleteIndex);
      setFormData({ ...formData, tags: formData.tags.filter((_, idx) => idx !== tagToDeleteIndex) });
      setShowConfirmModal(false);
      setShowTagUndoToast(true);
      setTagToDeleteIndex(null);
    }
  };

  const undoTagRemove = () => {
    if (removedTag !== null && removedTagIndex !== null) {
      const newTags = [...formData.tags];
      newTags.splice(removedTagIndex, 0, removedTag);
      setFormData({ ...formData, tags: newTags });
      setShowTagUndoToast(false);
      setRemovedTag(null);
      setRemovedTagIndex(null);
    }
  };

  // Reviews
  const addReview = () => setFormData({ ...formData, reviews: [...formData.reviews, { name:'', email:'', password:'', rating:0, comment:'' }] });
  const updateReview = (i, field, val) => {
    const reviews = [...formData.reviews];
    reviews[i][field] = val;
    setFormData({ ...formData, reviews });
  };

  const openReviewRemoveConfirmation = (i) => {
    setConfirmAction('removeReview');
    setConfirmMessage('Remove this review?');
    setReviewToRemoveIndex(i);
    setShowConfirmModal(true);
  };

  // Images
  const openImageRemoveConfirmation = (i) => {
    setConfirmAction('removeImage');
    setConfirmMessage('Remove this image?');
    setImageToRemove(i);
    setShowConfirmModal(true);
  };

  // Customizations
  const toggleCustomization = (cust) => {
    const exists = formData.customizations.find(c => c.optionId && String(c.optionId._id) === String(cust._id));
    if (exists) {
      setFormData({
        ...formData,
        customizations: formData.customizations.filter(c => String(c.optionId._id) !== String(cust._id))
      });
    } else {
      setFormData({
        ...formData,
        customizations: [
          ...formData.customizations,
          {
            optionId: {
              _id: cust._id,
              name: cust.name,
              type: cust.type,
              description: cust.description,
              isActive: cust.isActive,
              isDefault: cust.isDefault,
              priceModifier: cust.type === 'boolean'
                ? { ...cust.priceModifier }
                : { type:'fixed',value:0,operator:'+' },
              options: (cust.type==='select'||cust.type==='multi-select')
                ? cust.options.map(opt=>({ value:opt.value, priceModifier:{...opt.priceModifier}}))
                : []
            },
            enabled: true
          }
        ]
      });
    }
  };

  const updateBooleanModifier = (custId, field, val) => {
    setFormData({...formData, customizations: formData.customizations.map(c =>
      String(c.optionId._id)===String(custId)
        ? {...c, optionId:{...c.optionId, priceModifier:{...c.optionId.priceModifier,[field]:val}}}
        : c
    )});
  };

  const updateOptionModifier = (custId,optValue,field,val) => {
    setFormData({...formData, customizations: formData.customizations.map(c=>{
      if(String(c.optionId._id)===String(custId)){
        return {...c,
          optionId:{...c.optionId,
            options:c.optionId.options.map(opt =>
              opt.value===optValue
                ? {...opt, priceModifier:{...opt.priceModifier,[field]:val}}
                : opt
            )
          }};
      }
      return c;
    })});
  };

  // New customization functions
  const updateNewCustomization = (field, value) => {
    setNewCustomization({ ...newCustomization, [field]: value });
  };

  const updateNewCustomizationPriceModifier = (field, value) => {
    setNewCustomization({
      ...newCustomization,
      priceModifier: { ...newCustomization.priceModifier, [field]: value }
    });
  };

  const addNewCustomizationOption = () => {
    setNewCustomization({
      ...newCustomization,
      options: [...newCustomization.options, { value: '', priceModifier: { type: 'fixed', operator: '+', value: 0 } }]
    });
  };

  const updateNewCustomizationOption = (index, field, value) => {
    const updatedOptions = [...newCustomization.options];
    if (field === 'value') {
      updatedOptions[index].value = value;
    } else if (field === 'priceValue') {
      updatedOptions[index].priceModifier.value = value;
    } else {
      updatedOptions[index].priceModifier[field] = value;
    }
    setNewCustomization({ ...newCustomization, options: updatedOptions });
  };

  const removeNewCustomizationOption = (index) => {
    setNewCustomization({
      ...newCustomization,
      options: newCustomization.options.filter((_, i) => i !== index)
    });
  };

  const startEditingLocalCustomization = (index) => {
    const cust = formData.customizations[index];
    setNewCustomization({
      name: cust.optionId.name,
      type: cust.optionId.type,
      description: cust.optionId.description || '',
      priceModifier: cust.optionId.type === 'boolean' ? cust.optionId.priceModifier : { type: 'fixed', operator: '+', value: 0 },
      options: (cust.optionId.type === 'select' || cust.optionId.type === 'multi-select') ? cust.optionId.options.map(opt => ({ ...opt })) : [],
      isDefault: cust.optionId.isDefault || false,
      isActive: cust.optionId.isActive !== undefined ? cust.optionId.isActive : true
    });
    setEditingLocalIndex(index);
    setShowCustomizationModal(true);
  };

  const performCreateCustomization = async () => {
    try {
      const payload = {
        name: newCustomization.name,
        type: newCustomization.type,
        description: newCustomization.description,
        isDefault: newCustomization.isDefault,
        isActive: newCustomization.isActive
      };

      if (newCustomization.type === 'boolean') {
        payload.priceModifier = newCustomization.priceModifier;
      } else if (newCustomization.type === 'select' || newCustomization.type === 'multi-select') {
        payload.options = newCustomization.options;
      }

      const res = await httpClient.post('/customizations', payload);
      const newCust = res.data.customization;

      setAvailableCustomizations([...availableCustomizations, newCust]);
      toggleCustomization(newCust);
      showPopup('Customization created and selected', 'success');

      setNewCustomization({
        name: '',
        type: 'boolean',
        description: '',
        priceModifier: { type: 'fixed', operator: '+', value: 0 },
        options: [],
        isDefault: false,
        isActive: true
      });
      setShowCustomizationModal(false);
      setEditingLocalIndex(null);
    } catch (err) {
      console.error('Customization save error:', err);
      showPopup('Failed to create customization', 'error');
    }
  };

  const performUpdateCustomization = async () => {
    try {
      const cust = formData.customizations[editingLocalIndex];
      const payload = {
        name: newCustomization.name,
        type: newCustomization.type,
        description: newCustomization.description,
        isDefault: newCustomization.isDefault,
        isActive: newCustomization.isActive
      };

      if (newCustomization.type === 'boolean') {
        payload.priceModifier = newCustomization.priceModifier;
      } else if (newCustomization.type === 'select' || newCustomization.type === 'multi-select') {
        payload.options = newCustomization.options;
      }

      const res = await httpClient.put(`/customizations/${cust.optionId._id}`, payload);
      const updatedCust = res.data.customization;

      setAvailableCustomizations(availableCustomizations.map(c =>
        c._id === updatedCust._id ? updatedCust : c
      ));

      const updatedCustomizations = [...formData.customizations];
      updatedCustomizations[editingLocalIndex] = {
        ...updatedCustomizations[editingLocalIndex],
        optionId: updatedCust
      };
      setFormData({ ...formData, customizations: updatedCustomizations });

      showPopup('Customization updated', 'success');

      setNewCustomization({
        name: '',
        type: 'boolean',
        description: '',
        priceModifier: { type: 'fixed', operator: '+', value: 0 },
        options: [],
        isDefault: false,
        isActive: true
      });
      setShowCustomizationModal(false);
      setEditingLocalIndex(null);
    } catch (err) {
      console.error('Customization update error:', err);
      showPopup('Failed to update customization', 'error');
    }
  };

  const createOrUpdateCustomization = async () => {
    if (editingLocalIndex !== null) {
      await performUpdateCustomization();
    } else {
      await performCreateCustomization();
    }
  };

  const confirmHandler = async () => {
    if (confirmAction === 'deleteReview') {
      try {
        await httpClient.delete(`/reviews/${reviewToDelete._id}`);
        const idx = existingReviews.findIndex(r => r._id === reviewToDelete._id);
        if (idx !== -1) {
          setExistingReviews(existingReviews.filter((_, i) => i !== idx));
        }
        setDeletedReview(reviewToDelete);
        setShowReviewDeleteUndoToast(true);
      } catch (err) {
        console.error('Failed to delete review', err);
        showPopup('Failed to delete review', 'error');
      }
    } else if (confirmAction === 'deleteTag') {
      confirmTagDelete();
    } else if (confirmAction === 'removeImage') {
      const newImages = formData.images.filter((_, idx) => idx !== imageToRemove);
      setFormData({ ...formData, images: newImages });
      const removedUrl = formData.images[imageToRemove];
      setRemovedImage(removedUrl);
      setImagesToDelete([...imagesToDelete, removedUrl]);
      setShowUndoToast(true);
    } else if (confirmAction === 'removeReview') {
      const removed = formData.reviews[reviewToRemoveIndex];
      setRemovedReview(removed);
      setFormData({ ...formData, reviews: formData.reviews.filter((_, idx) => idx !== reviewToRemoveIndex) });
      setShowReviewRemoveUndoToast(true);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setReviewToDelete(null);
    setTagToDeleteIndex(null);
    setImageToRemove(null);
    setReviewToRemoveIndex(null);
  };

  const cancelHandler = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setReviewToDelete(null);
    setTagToDeleteIndex(null);
    setImageToRemove(null);
    setReviewToRemoveIndex(null);
  };

  // Detect unsaved changes by comparing formData with editingProduct or initial state
  useEffect(() => {
    if (!editingProduct) {
      // New product: check if any field is non-empty or selectedFiles/images exist
      const hasChanges = formData.name !== '' || formData.description !== '' || formData.price !== '' || formData.stock !== '' || formData.category !== '' || formData.brand !== 'MS Enterprises' || formData.images.length > 0 || selectedFiles.length > 0;
      setHasUnsavedChanges(hasChanges);
      setIsFormDirty(hasChanges);
    } else {
      // Existing product: compare fields
      const hasChanges =
        formData.name !== (editingProduct.name || '') ||
        formData.description !== (editingProduct.description || '') ||
        formData.price !== (editingProduct.price?.toString() || '') ||
        formData.stock !== (editingProduct.stock?.toString() || '') ||
        formData.category !== (editingProduct.category || '') ||
        formData.brand !== (editingProduct.brand || 'MS Enterprises') ||
        formData.images.length !== (editingProduct.images?.length || 0) ||
        selectedFiles.length > 0;
      setHasUnsavedChanges(hasChanges);
      setIsFormDirty(hasChanges);
    }
  }, [formData, selectedFiles, editingProduct, setIsFormDirty]);

  // Handle cancel button click with confirmation if unsaved changes exist
  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  // Handle browser refresh or navigation away with confirmation if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Please ensure that you have no unsaved changes.';
        return 'Please ensure that you have no unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Handle sidebar navigation blocking (assuming sidebar navigation triggers route changes)
  // This requires integration with routing library (e.g., react-router)
  // For demonstration, we add a listener for route changes if react-router is used
  // If not using react-router, this part needs to be adapted accordingly

  // Removed useBlocker due to error with router context
  // Alternative: Use window event listener for beforeunload and manual confirmation on cancel button

  // Confirmation modal for cancel
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  const cancelCancel = () => {
    setShowCancelConfirm(false);
  };

  // Undo Functions
  const undoReviewRemove = () => {
    if (removedReview) {
      setFormData({ ...formData, reviews: [...formData.reviews, removedReview] });
      setShowReviewRemoveUndoToast(false);
      setRemovedReview(null);
    }
  };

  const undoRemove = () => {
    if (removedImage) {
      setFormData({ ...formData, images: [...formData.images, removedImage] });
      setImagesToDelete(imagesToDelete.filter(url => url !== removedImage));
      setShowUndoToast(false);
      setRemovedImage(null);
    }
  };

  const undoReviewDelete = async () => {
    if (deletedReview) {
      try {
        await httpClient.post('/reviews/admin', {
          productId: editingProduct._id,
          reviewerName: deletedReview.user?.username || 'Anonymous',
          reviewerEmail: deletedReview.user?.email || '',
          reviewerPassword: '',
          rating: deletedReview.rating,
          comment: deletedReview.comment
        });
        setExistingReviews([...existingReviews, deletedReview]);
        setShowReviewDeleteUndoToast(false);
        setDeletedReview(null);
      } catch (err) {
        console.error('Failed to restore review', err);
        showPopup('Failed to restore review', 'error');
      }
    }
  };

  // Submit
  const performSubmit = async () => {
    try {
      let uploadedUrls = [];
      if (selectedFiles.length > 0) {
        const formDataToUpload = new FormData();
        selectedFiles.forEach(file => {
          formDataToUpload.append('images', file);
        });
        const res = await httpClient.post('/admin/upload-images', formDataToUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data && res.data.urls) {
          uploadedUrls = res.data.urls;
        } else {
          showPopup('Failed to upload images', 'error');
          return;
        }
      }

      const { reviews, images, ...productPayloadRest } = formData;
      const productPayload = {
        ...productPayloadRest,
        price: Number(formData.price) || 0,
        stock: Number(formData.stock) || 0,
        images: [...images, ...uploadedUrls]
      };

      let productRes;
      if(editingProduct?._id){
        productRes = await httpClient.patch(`/admin2009/products/${editingProduct._id}`, productPayload);
      }else{
        productRes = await httpClient.post('/admin2009/products', productPayload);
      }
      const productId = productRes.data._id || productRes.data.product?._id;

      if (imagesToDelete.length > 0) {
        try {
          await httpClient.delete('/admin/delete-images', {
            data: { imageUrls: imagesToDelete }
          });
        } catch (err) {
          console.error('Failed to delete images:', err);
        }
      }

      for(const rev of formData.reviews){
        if(rev.email && rev.password && rev.rating && rev.comment){
          await httpClient.post('/reviews/admin',{
            productId,
            reviewerName: rev.name,
            reviewerEmail: rev.email,
            reviewerPassword: rev.password,
            rating: rev.rating,
            comment: rev.comment
          });
        }
      }

      showPopup('Product and reviews saved successfully', 'success');
      setSelectedFiles([]);
      setImagesToDelete([]);
      setHasUnsavedChanges(false);
      setIsFormDirty(false);
      onCancel();
    }catch(err){
      console.error('Save error:', err.response?.data || err.message);
      showPopup('Save failed. Please check the form for errors.', 'error');
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!showSubmitConfirm) {
      setShowSubmitConfirm(true);
    }
  };

  return (
    <div className="admin-product-form">
      <div className="form-header">
        <div className="header-content">
          <div className="header-icon">
            <FiPackage />
          </div>
          <div>
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="header-subtitle">Manage your product information and details</p>
          </div>
        </div>
          <button className="btn btn-secondary" onClick={handleCancelClick}>
            <FiX /> Cancel
          </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        {/* General Info */}
        <section className="form-section">
          <div className="section-header">
            <h3>General Information</h3>
            <FiPackage className="section-icon" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Product Name *</label>
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                className="form-input" 
                placeholder="Enter product name"
                required
              />
            </div>
            <div className="form-group">
              <label>Brand *</label>
              <select name="brand" value={formData.brand} onChange={handleInputChange} className="form-select">
                <option>MS Enterprises</option>
                <option>Jaksh</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select
                value={showNewCategoryInput ? 'add-new' : formData.category}
                onChange={(e) => {
                  if (e.target.value === 'add-new') {
                    setShowNewCategoryInput(true);
                    setFormData({ ...formData, category: '' });
                  } else {
                    setShowNewCategoryInput(false);
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
                className="form-select"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="add-new">+ Add New Category</option>
              </select>
              {showNewCategoryInput && (
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter new category"
                  required
                  style={{ marginTop: '0.5rem' }}
                />
              )}
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input 
                type="number" 
                name="price" 
                value={formData.price} 
                onChange={handleInputChange} 
                className="form-input" 
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Stock Quantity</label>
              <input 
                type="number" 
                name="stock" 
                value={formData.stock} 
                onChange={handleInputChange} 
                className="form-input" 
                placeholder="0"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              className="form-textarea" 
              placeholder="Enter detailed product description"
              required
              rows="4"
            />
          </div>
        </section>

        {/* Product Images */}
        <section className="form-section">
          <div className="section-header">
            <h3>Product Images</h3>
            <FiImage className="section-icon" />
          </div>
          <div
            className={`image-gallery ${isDragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragEnter={(e) => { 
              e.preventDefault(); 
              setDragCounter(prev => prev + 1);
              setIsDragActive(true); 
            }}
            onDragLeave={(e) => { 
              setDragCounter(prev => {
                const newCount = prev - 1;
                if (newCount <= 0) {
                  setIsDragActive(false);
                  return 0;
                }
                return newCount;
              });
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragActive(false);
              setDragCounter(0);
              const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
              if (files.length > 0) {
                setSelectedFiles([...selectedFiles, ...files]);
              }
            }}
          >
            {formData.images.map((imageUrl, i) => (
              <div key={i} className="image-item" onClick={() => setPreviewImage(imageUrl)}>
                <img src={imageUrl} alt="Product" className="image-thumbnail" />
                <div className="image-overlay">
                  <FiImage size={24} />
                  <span>Click to Preview</span>
                </div>
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={(e) => { e.stopPropagation(); openImageRemoveConfirmation(i); }}
                >
                  <FiX />
                </button>
              </div>
            ))}
            {selectedFiles.map((file, i) => (
              <div key={`new-${i}`} className="image-item" onClick={() => setPreviewImage(URL.createObjectURL(file))}>
                <img src={URL.createObjectURL(file)} alt="New Product" className="image-thumbnail" />
                <div className="image-overlay">
                  <FiImage size={24} />
                  <span>Click to Preview</span>
                </div>
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={(e) => { e.stopPropagation(); setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i)); }}
                >
                  <FiX />
                </button>
              </div>
            ))}
            <div className="image-upload-box">
              <input
                type="file"
                accept="image/*"
                multiple
                id="image-upload-input"
                style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files);
                  if (files.length === 0) return;
                  setSelectedFiles([...selectedFiles, ...files]);
                  e.target.value = null;
                }}
              />
              <button
                type="button"
                className="upload-trigger"
                onClick={() => document.getElementById('image-upload-input').click()}
              >
                <FiPlus size={32} />
                <span>Upload Images</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="form-section">
          <div className="section-header">
            <h3>Product Tags</h3>
            <FiTag className="section-icon" />
          </div>
          <div className="tags-container">
            {formData.tags.map((tag, i) => (
              <div key={i} className="tag-item">
                <input 
                  value={tag} 
                  onChange={e => updateTag(i, e.target.value)} 
                  className="tag-input" 
                  placeholder="Enter tag"
                />
                <button 
                  type="button" 
                  className="tag-remove-btn" 
                  onClick={() => openTagDeleteConfirmation(i)}
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline" onClick={addTag}>
            <FiPlus /> Add Tag
          </button>
        </section>

        {/* Customizations */}
        <section className="form-section">
          <div className="section-header">
            <h3>Product Customizations</h3>
            <FiSliders className="section-icon" />
          </div>
          <div className="customizations-grid">
            {availableCustomizations.map(cust => {
              const selected = formData.customizations.find(c => String(c.optionId._id) === String(cust._id));
              return (
                <div key={cust._id} className={`customization-card ${selected ? 'selected' : ''}`}>
                  <div className="customization-header">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={!!selected} 
                        onChange={() => toggleCustomization(cust)}
                      />
                      <div className="customization-info">
                        <span className="customization-name">{cust.name}</span>
                        <span className="customization-type">{cust.type}</span>
                      </div>
                    </label>
                    {selected && (
                      <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={() => startEditingLocalCustomization(formData.customizations.indexOf(selected))}
                      >
                        <FiEdit />
                      </button>
                    )}
                  </div>
                  {selected && cust.type === 'boolean' && (
                    <div className="customization-body">
                      <div className="price-modifier-group">
                        <label>Price Modifier</label>
                        <div className="price-delta">
                          <select 
                            value={selected.optionId.priceModifier?.operator} 
                            onChange={e => updateBooleanModifier(cust._id, 'operator', e.target.value)}
                          >
                            <option value="+">+</option>
                            <option value="-">-</option>
                          </select>
                          <input 
                            type="number" 
                            value={selected.optionId.priceModifier?.value || 0} 
                            onChange={e => updateBooleanModifier(cust._id, 'value', Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {selected && (cust.type === 'select' || cust.type === 'multi-select') && (
                    <div className="customization-body">
                      <label>Options Price Modifiers</label>
                      {selected.optionId.options.map((opt, index) => (
                        <div key={index} className="option-with-price">
                          <span className="option-label">{typeof opt.value === 'object' ? (opt.value.name || opt.value.url || JSON.stringify(opt.value)) : opt.value}</span>
                          <select 
                            value={opt.priceModifier.operator} 
                            onChange={e => updateOptionModifier(cust._id, opt.value, 'operator', e.target.value)}
                          >
                            <option value="+">+</option>
                            <option value="-">-</option>
                          </select>
                          <input 
                            type="number" 
                            value={opt.priceModifier.value} 
                            onChange={e => updateOptionModifier(cust._id, opt.value, 'value', Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => { setEditingLocalIndex(null); setShowCustomizationModal(true); }}
          >
            <FiPlus /> Create New Customization
          </button>
        </section>

        {/* Existing Reviews */}
        <section className="form-section">
          <div className="section-header">
            <h3>Existing Reviews</h3>
            <FiStar className="section-icon" />
          </div>
          {existingReviews.length === 0 ? (
            <div className="empty-state">
              <FiStar size={48} />
              <p>No existing reviews for this product</p>
            </div>
          ) : (
            <div className="reviews-grid">
              {existingReviews.map((rev, i) => (
                <div key={rev._id || i} className="review-card existing">
                  <div className="review-header">
                    <div>
                      <h4>{rev.user?.username || 'Anonymous'}</h4>
                      <div className="rating-display">
                        {[...Array(5)].map((_, idx) => (
                          <FiStar 
                            key={idx} 
                            className={idx < rev.rating ? 'star-filled' : 'star-empty'} 
                          />
                        ))}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-icon-danger" 
                      onClick={() => { 
                        setConfirmAction('deleteReview'); 
                        setConfirmMessage('Delete this review?'); 
                        setReviewToDelete(rev); 
                        setShowConfirmModal(true); 
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  <p className="review-comment">{rev.comment}</p>
                  <small className="review-date">
                    {new Date(rev.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add New Reviews */}
        <section className="form-section">
          <div className="section-header">
            <h3>Add New Reviews</h3>
            <FiPlus className="section-icon" />
          </div>
          {formData.reviews.length === 0 ? (
            <div className="empty-state-small">
              <p>No new reviews added yet</p>
            </div>
          ) : (
            <div className="reviews-grid">
              {formData.reviews.map((rev, i) => (
                <div key={i} className="review-card new">
                  <div className="review-form-grid">
                    <div className="form-group">
                      <label>Name</label>
                      <input 
                        placeholder="Reviewer name" 
                        value={rev.name} 
                        onChange={e => updateReview(i, 'name', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        placeholder="reviewer@email.com" 
                        value={rev.email} 
                        onChange={e => updateReview(i, 'email', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input 
                        type="password" 
                        placeholder="Password" 
                        value={rev.password} 
                        onChange={e => updateReview(i, 'password', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Rating</label>
                      <select
                        value={rev.rating}
                        onChange={e => updateReview(i, 'rating', Number(e.target.value))}
                        className="form-select"
                      >
                        <option value={0}>Select rating</option>
                        <option value={1}>⭐ 1 Star</option>
                        <option value={2}>⭐⭐ 2 Stars</option>
                        <option value={3}>⭐⭐⭐ 3 Stars</option>
                        <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                        <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Comment</label>
                    <textarea 
                      placeholder="Write review comment (minimum 10 characters)" 
                      minLength={10} 
                      value={rev.comment} 
                      onChange={e => updateReview(i, 'comment', e.target.value)}
                      className="form-textarea"
                      rows="3"
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => openReviewRemoveConfirmation(i)}
                  >
                    <FiTrash2 /> Remove Review
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-outline" onClick={addReview}>
            <FiPlus /> Add Review
          </button>
        </section>

        <div className="form-footer">
          <button type="button" className="btn btn-secondary" onClick={handleCancelClick}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-large">
            <FiCheck /> {editingProduct ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>

      <ConfirmModal show={showConfirmModal} message={confirmMessage} onConfirm={confirmHandler} onCancel={cancelHandler} />
      {showSubmitConfirm && (
        <ConfirmModal
          show={true}
          onConfirm={() => { setShowSubmitConfirm(false); performSubmit(); }}
          onCancel={() => setShowSubmitConfirm(false)}
          message="Are you sure you want to submit this product?"
        />
      )}
      
      {/* Keep undo toasts exactly as they were */}
      {showUndoToast && <div className="undo-toast"><div className="toast-content"><span>Image removed</span><button className="undo-btn" onClick={undoRemove}>Undo</button></div></div>}
      {showTagUndoToast && <div className="undo-toast"><div className="toast-content"><span>Tag removed</span><button className="undo-btn" onClick={undoTagRemove}>Undo</button></div></div>}
      {showReviewRemoveUndoToast && <div className="undo-toast"><div className="toast-content"><span>Review removed</span><button className="undo-btn" onClick={undoReviewRemove}>Undo</button></div></div>}
      {showReviewDeleteUndoToast && <div className="undo-toast"><div className="toast-content"><span>Review deleted</span><button className="undo-btn" onClick={undoReviewDelete}>Undo</button></div></div>}

      {previewImage && (
        <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="preview-container">
            <button className="preview-close-btn" onClick={() => setPreviewImage(null)}>
              <FiX size={24} />
            </button>
            <img src={previewImage} alt="Preview" className="preview-image" />
          </div>
        </div>
      )}

      <CustomizationModal
        show={showCustomizationModal}
        onClose={() => {
          setShowCustomizationModal(false);
          setNewCustomization({
            name: '',
            type: 'boolean',
            description: '',
            priceModifier: { type: 'fixed', operator: '+', value: 0 },
            options: [],
            isDefault: false,
            isActive: true
          });
          setEditingLocalIndex(null);
        }}
        newCustomization={newCustomization}
        updateNewCustomization={updateNewCustomization}
        updateNewCustomizationPriceModifier={updateNewCustomizationPriceModifier}
        addNewCustomizationOption={addNewCustomizationOption}
        updateNewCustomizationOption={updateNewCustomizationOption}
        removeNewCustomizationOption={removeNewCustomizationOption}
        createOrUpdateCustomization={createOrUpdateCustomization}
        editingLocalIndex={editingLocalIndex}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        show={showCancelConfirm}
        onConfirm={confirmCancel}
        onCancel={cancelCancel}
        message="Please ensure that you have no unsaved changes."
      />
    </div>
  );
};

export default AdminProductForm;