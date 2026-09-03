import { useState, useRef, useEffect, useContext } from 'react';
import { API_BASE } from '../../constants/api'; // Adjust path as needed
import { FiUpload, FiX, FiPlus, FiMinus, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CustomizationOptions.css';

// Add this component at the top, after imports and before CustomizationOptions component
const DynamicFileUpload = ({ optionId, optionType, optionName, currentFile, onFileChange, formatFileSize, onImageClick }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndProcessFile = (file) => {
    setError(null);

    // Validate file type for images
    if (optionType === 'image' && !file.type.startsWith('image/')) {
      setError('Please upload only image files');
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return false;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      preview: optionType === 'image' ? URL.createObjectURL(file) : null,
      url: null // Will be set after upload to S3
    };

    onFileChange(fileData);
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemove = () => {
    if (currentFile?.preview) {
      URL.revokeObjectURL(currentFile.preview);
    }
    setPreview(null);
    onFileChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (imageSrc) => {
    if (onImageClick) {
      onImageClick(imageSrc);
    }
  };

  return (
    <div className="dynamic-file-upload">
      {!currentFile ? (
        <>
          <div
            className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={optionType === 'image' ? 'image/*' : '*'}
              onChange={handleFileSelect}
              className="file-input"
              id={`dynamic-file-${optionId}`}
            />
            <label htmlFor={`dynamic-file-${optionId}`} className="file-upload-label">
              <div className="upload-icon-wrapper small">
                <FiUpload className="upload-icon" />
              </div>
              <span className="upload-title small">
                Drag & Drop or Click to Upload {optionType === 'image' ? 'Image' : 'File'}
              </span>
              <small className="upload-subtitle">Maximum 5MB • {optionType === 'image' ? 'JPG, PNG, GIF' : 'Any file type'}</small>
            </label>
          </div>

          {error && (
            <div className="error-message">
              <FiX className="error-icon" />
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="uploaded-files">
          <div className="files-list">
            <div className="file-item">
              {currentFile?.preview && (
                <div className="file-preview">
                  <img
                    src={currentFile.preview}
                    alt={currentFile?.name || 'Uploaded file'}
                    onClick={() => handleImageClick(currentFile.preview)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              )}
              <div className="file-info">
                <span className="file-name">{currentFile?.name || 'Uploaded file'}</span>
                <span className="file-size">{currentFile?.size ? formatFileSize(currentFile.size) : 'Unknown size'}</span>
              </div>
              <button
                type="button"
                className="remove-file"
                onClick={handleRemove}
                title="Remove file"
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { PopupContext } from '../../context/PopupContext';

const CustomizationOptions = ({ product, customization, onCustomizationChange, quantity, onQuantityChange }) => {
  const { showPopup } = useContext(PopupContext);
  const [predefinedCustomizations, setPredefinedCustomizations] = useState([]);
  const [comments, setComments] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedTurnaround, setSelectedTurnaround] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [dynamicCustomizations, setDynamicCustomizations] = useState({});

  // Set default selections for select and multi-select options with 0 price change
  useEffect(() => {
    if (product.customizationOptions) {
      const defaults = {};
      product.customizationOptions.forEach(customization => {
        const option = customization.optionId;
        if (option.type === 'select') {
          const defaultOpt = option.options.find(opt => opt.priceModifier && opt.priceModifier.value === 0);
          if (defaultOpt && !dynamicCustomizations[option._id]) {
            defaults[option._id] = defaultOpt.value;
          }
        } else if (option.type === 'multi-select') {
          const defaultOpt = option.options.find(opt => opt.priceModifier && opt.priceModifier.value === 0);
          if (defaultOpt) {
            const current = dynamicCustomizations[option._id] || [];
            if (!current.includes(defaultOpt.value)) {
              defaults[option._id] = [...current, defaultOpt.value];
            }
          }
        }
      });
      if (Object.keys(defaults).length > 0) {
        setDynamicCustomizations(prev => ({ ...prev, ...defaults }));
        const updatedCustomization = {
          ...customization,
          dynamicCustomizations: { ...dynamicCustomizations, ...defaults }
        };
        onCustomizationChange(updatedCustomization);
      }
    }
  }, [product.customizationOptions]);

  // Image preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);

  const handleDynamicCustomizationChange = (customizationId, value) => {
    const updatedDynamicCustomizations = {
      ...dynamicCustomizations,
      [customizationId]: value
    };
    setDynamicCustomizations(updatedDynamicCustomizations);

    const updatedCustomization = {
      ...customization,
      dynamicCustomizations: updatedDynamicCustomizations
    };
    onCustomizationChange(updatedCustomization);

    // Removed: Image upload on file selection - will be handled in ProductDetailPage on add to cart
  };

  const uploadImageToS3 = async (file, customizationId) => {
  const formData = new FormData();
  formData.append('images', file); // 'images' to match multer field name
  formData.append('customizationId', customizationId);

  try {
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/admin2009/upload-images`, {
      method: 'POST',
      body: formData,
      headers: headers
    });

    const result = await response.json();

    if (response.ok && result.success && result.urls && result.urls.length > 0) {
      // Update the customization with the uploaded URL
      const updatedDynamicCustomizations = {
        ...dynamicCustomizations,
        [customizationId]: {
          ...dynamicCustomizations[customizationId],
          url: result.urls[0],
          name: file.name,
          size: file.size,
          type: file.type,
          preview: URL.createObjectURL(file)
        }
      };
      setDynamicCustomizations(updatedDynamicCustomizations);

      const updatedCustomization = {
        ...customization,
        dynamicCustomizations: updatedDynamicCustomizations
      };
      onCustomizationChange(updatedCustomization);

      console.log('✅ Image uploaded to S3:', result.urls[0]);
    } else {
      console.error('❌ Failed to upload image:', result);
              showPopup('Failed to upload image. Please try again.', 'error');    }
  } catch (error) {
    console.error('❌ Error uploading image:', error);
          showPopup('Error uploading image. Please try again.', 'error');  }
};

  const validateAndProcessFiles = (files) => {
    const validFiles = [];
    const newErrors = {};

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        newErrors.fileType = 'Please upload only image files';
        return;
      }

      // ✅ Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        newErrors.fileSize = 'File size must be less than 5MB';
        return;
      }

      validFiles.push({
        file,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file)
      });
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      delete newErrors.fileType;
      delete newErrors.fileSize;
      
      const updatedCustomization = {
        ...customization,
        uploadedFiles: [...uploadedFiles, ...validFiles].map(f => ({
          name: f.name,
          size: f.size,
          type: f.file.type
        }))
      };
      onCustomizationChange(updatedCustomization);
    }

    setErrors(newErrors);
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      validateAndProcessFiles(files);
    }
  };

  // ✅ Drag and Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFiles(files);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);

    if (uploadedFiles[index].preview) {
      URL.revokeObjectURL(uploadedFiles[index].preview);
    }

    const updatedCustomization = {
      ...customization,
      uploadedFiles: newFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.file.type
      }))
    };
    onCustomizationChange(updatedCustomization);
  };

  const handleStyleChange = (style) => {
    setSelectedStyle(style);
    const updatedCustomization = { ...customization, style };
    onCustomizationChange(updatedCustomization);
  };

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    const updatedCustomization = { ...customization, size };
    onCustomizationChange(updatedCustomization);
  };

  const handleTurnaroundChange = (turnaround) => {
    setSelectedTurnaround(turnaround);
    const updatedCustomization = { ...customization, turnaround };
    onCustomizationChange(updatedCustomization);
  };

  const handleCommentsChange = (value) => {
    setComments(value);
    const updatedCustomization = { ...customization, comments: value };
    onCustomizationChange(updatedCustomization);
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 1)) {
      onQuantityChange(newQuantity);
    }
  };

  const toggleAdvanced = () => {
    setAdvancedOpen(!advancedOpen);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageClick = (imageSrc) => {
    setSelectedPreview(imageSrc);
    setShowPreviewModal(true);
  };

  const closeModal = () => {
    setShowPreviewModal(false);
    setSelectedPreview(null);
  };

  return (
    <div className="customization-options">
      {/* ✅ MODERN File Upload Section with Drag & Drop */}
      {product.customizationOptions?.allowsImageUpload && (
        <div className="customization-section">
          <h3>Upload Artwork</h3>
          <div
            className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-upload-label">
              <div className="upload-icon-wrapper">
                <FiUpload className="upload-icon" />
              </div>
              <span className="upload-title">Drag & Drop or Click to Upload</span>
              <small className="upload-subtitle">Maximum 5MB per file • JPG, PNG, GIF</small>
            </label>
          </div>

          {errors.fileType && (
            <div className="error-message">
              <FiX className="error-icon" />
              {errors.fileType}
            </div>
          )}

          {errors.fileSize && (
            <div className="error-message">
              <FiX className="error-icon" />
              {errors.fileSize}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h4>Uploaded Files ({uploadedFiles.length})</h4>
              <div className="files-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-preview">
                      <img
                        src={file.preview}
                        alt={file.name}
                        onClick={() => handleImageClick(file.preview)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="remove-file"
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Customizations */}
      {product.customizationOptions && product.customizationOptions.length > 0 && (
        <div className="customization-section">
          {product.customizationOptions.map((customization) => {
            const option = customization.optionId;
            if (!option) return null;

            switch (option.type) {
              case 'boolean':
  return (
    <div key={option._id} className="customization-group">
      <h3>{option.name}</h3>
      <div className="checkbox-option">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={
              option._id === '68dc1da4f36ac028a2d6d515'
                ? dynamicCustomizations[option._id] !== false && dynamicCustomizations[option._id] !== undefined
                : dynamicCustomizations[option._id] || false
            }
            onChange={(e) => {
              if (option._id === '68dc1da4f36ac028a2d6d515') {
                // For image upload option, set to null when checked (to show upload area)
                // Set to false when unchecked (to hide upload area)
                handleDynamicCustomizationChange(option._id, e.target.checked ? null : false);
              } else {
                handleDynamicCustomizationChange(option._id, e.target.checked);
              }
            }}
          />
          <span className="checkbox-text">{option.name}</span>
        </label>
        {option.priceModifier && Number(option.priceModifier.value) !== 0 && (
          <span className={`price-modifier ${option.priceModifier.operator === '+' ? 'positive' : 'negative'}`}>
            {option.priceModifier.operator}₹{option.priceModifier.value}
          </span>
        )}
      </div>
      {/* Special handling for Image Upload customization */}
      {option._id === '68dc1da4f36ac028a2d6d515' && 
       dynamicCustomizations[option._id] !== false && 
       dynamicCustomizations[option._id] !== undefined && (
        <div className="image-upload-section">
          <DynamicFileUpload
            optionId={option._id}
            optionType="image"
            optionName={option.name}
            currentFile={
              dynamicCustomizations[option._id] && typeof dynamicCustomizations[option._id] === 'object'
                ? dynamicCustomizations[option._id]
                : null
            }
            onFileChange={(fileData) => handleDynamicCustomizationChange(option._id, fileData)}
            formatFileSize={formatFileSize}
            onImageClick={handleImageClick}
          />
        </div>
      )}
      {/* Show existing uploaded image if available */}
      {option._id === '68dc1da4f36ac028a2d6d515' && 
       option.options && 
       option.options[0] && 
       option.options[0].imageUrl && 
       !dynamicCustomizations[option._id] && (
        <div className="image-upload-preview">
          <h4>Default Image:</h4>
          <img
            src={option.options[0].imageUrl}
            alt="Customization Image"
            style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );

              case 'select':
                return (
                  <div key={option._id} className="customization-group">
                    <h3>{option.name}</h3>
                    <div className="options-grid">
                      {option.options && option.options.length > 0 ? (
                        option.options.map((opt, index) => (
                          <div key={index} className="option-item">
                            <button
                              type="button"
                              className={`option-button ${dynamicCustomizations[option._id] === opt.value ? 'selected' : ''}`}
                              onClick={() => handleDynamicCustomizationChange(option._id, opt.value)}
                            >
                              <span className="option-value">{opt.value}</span>
                              {opt.priceModifier && opt.priceModifier.value !== 0 && (
                                <span className={`price-tag ${opt.priceModifier.operator === '+' ? 'positive' : 'negative'}`}>
                                  {opt.priceModifier.operator}₹{opt.priceModifier.value}
                                </span>
                              )}
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="no-options">No options available</p>
                      )}
                    </div>
                  </div>
                );

              case 'multi-select':
                return (
                  <div key={option._id} className="customization-group">
                    <h3>{option.name}</h3>
                    <div className="options-grid">
                      {option.options && option.options.length > 0 ? (
                        option.options.map((opt, index) => {
                          const currentSelections = dynamicCustomizations[option._id] || [];
                          const isSelected = currentSelections.includes(opt.value);
                          return (
                            <div key={index} className="option-item">
                              <button
                                type="button"
                                className={`option-button ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  const current = dynamicCustomizations[option._id] || [];
                                  if (current.includes(opt.value)) {
                                    handleDynamicCustomizationChange(option._id, current.filter(v => v !== opt.value));
                                  } else {
                                    handleDynamicCustomizationChange(option._id, [...current, opt.value]);
                                  }
                                }}
                              >
                                <span className="option-value">{opt.value}</span>
                                {opt.priceModifier && opt.priceModifier.value !== 0 && (
                                  <span className={`price-tag ${opt.priceModifier.operator === '+' ? 'positive' : 'negative'}`}>
                                    {opt.priceModifier.operator}₹{opt.priceModifier.value}
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="no-options">No options available</p>
                      )}
                    </div>
                  </div>
                );

              case 'text':
                return (
                  <div key={option._id} className="customization-group">
                    <h3>{option.name}</h3>
                    <div className="form-group">
                      <textarea
                        value={dynamicCustomizations[option._id] || ''}
                        onChange={(e) => handleDynamicCustomizationChange(option._id, e.target.value)}
                        placeholder={`Enter ${option.name.toLowerCase()}...`}
                        rows={3}
                        maxLength={500}
                        className="text-input"
                      />
                    </div>
                  </div>
                );

              case 'image':
              case 'file':
                return (
                  <div key={option._id} className="customization-group">
                    <h3>{option.name}</h3>
                    <DynamicFileUpload
                      optionId={option._id}
                      optionType={option.type}
                      optionName={option.name}
                      currentFile={dynamicCustomizations[option._id]}
                      onFileChange={(fileData) => handleDynamicCustomizationChange(option._id, fileData)}
                      formatFileSize={formatFileSize}
                      onImageClick={handleImageClick}
                    />
                  </div>
                );

              default:
                return (
                  <div key={option._id} className="customization-group">
                    <h3>{option.name}</h3>
                    <p className="unsupported-type">Unsupported customization type: {option.type}</p>
                  </div>
                );
            }
          })}
        </div>
      )}

      {/* Size Selection */}
      {product.customizationOptions?.availableSizes && product.customizationOptions.availableSizes.length > 0 && (
        <div className="customization-section">
          <h3>Size</h3>
          <div className="options-grid">
            {product.customizationOptions.availableSizes.map((size, index) => (
              <div key={index} className="option-item">
                <button
                  type="button"
                  className={`option-button ${selectedSize === size ? 'selected' : ''}`}
                  onClick={() => handleSizeChange(size)}
                >
                  {size}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div className="customization-section">
        <button
          type="button"
          className="advanced-toggle"
          onClick={toggleAdvanced}
        >
          <span>Advanced Options</span>
          {advancedOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {advancedOpen && (
          <div className="advanced-options">
            <div className="form-group">
              <label htmlFor="comments">Special Instructions</label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => handleCommentsChange(e.target.value)}
                placeholder="Add any special instructions or notes..."
                rows={3}
                maxLength={500}
                className="text-input"
              />
              <small className="character-count">{comments.length}/500</small>
            </div>
          </div>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="customization-section">
        <h3>Quantity</h3>
        <div className="quantity-selector">
          <button
            type="button"
            className="quantity-btn"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <FiMinus />
          </button>
          <span className="quantity-display">{quantity}</span>
          <button
            type="button"
            className="quantity-btn"
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= (product?.stock || 1)}
          >
            <FiPlus />
          </button>
        </div>
        <small className="quantity-info">
          {product?.stock > 0 ? `${product.stock} available` : 'Out of stock'}
        </small>
      </div>

      {/* Customization Summary */}
      {(Object.keys(customization).length > 0 || uploadedFiles.length > 0) && (
        <div className="customization-summary">
          <h3>Customization Summary</h3>
          <div className="summary-list">
            {Object.entries(customization).map(([key, value]) => {
              if (key === 'dynamicCustomizations') {
                return Object.entries(value).map(([id, val]) => {
                  const option = product.customizationOptions.find(c => String(c.optionId._id) === String(id))?.optionId;
                  const displayName = option?.name || id;

                  return (
                    <div key={id} className="summary-item">
                      <span className="summary-label">{displayName}:</span>
                      <span className="summary-value">
                        {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? (
                          val?.preview ? (
                            <img
                              src={val.preview}
                              alt={val?.name || 'Uploaded image'}
                              onClick={() => handleImageClick(val.preview)}
                              style={{ maxWidth: '50px', maxHeight: '50px', cursor: 'pointer', borderRadius: '4px' }}
                            />
                          ) : (val?.name || 'Uploaded file')
                        ) : String(val)}
                      </span>
                    </div>
                  );
                });
              } else if (key === 'uploadedFiles') {
                return (
                  <div key={key} className="summary-item">
                    <span className="summary-label">Files:</span>
                    <span className="summary-value">{value.length} uploaded</span>
                  </div>
                );
              } else {
                return (
                  <div key={key} className="summary-item">
                    <span className="summary-label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                    <span className="summary-value">
                      {typeof value === 'object' ? (
                        value?.preview ? (
                          <img
                            src={value.preview}
                            alt={value?.name || 'Uploaded image'}
                            onClick={() => handleImageClick(value.preview)}
                            style={{ maxWidth: '50px', maxHeight: '50px', cursor: 'pointer', borderRadius: '4px' }}
                          />
                        ) : (value?.name || 'Uploaded file')
                      ) : String(value)}
                    </span>
                  </div>
                );
              }
            })}
            <div className="summary-item">
              <span className="summary-label">Quantity:</span>
              <span className="summary-value">{quantity}</span>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreviewModal && selectedPreview && (
        <div className="image-preview-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-modal"
              onClick={closeModal}
              aria-label="Close preview"
            >
              <FiX />
            </button>
            <img src={selectedPreview} alt="Preview" className="preview-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizationOptions;