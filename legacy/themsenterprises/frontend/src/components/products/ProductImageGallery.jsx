import { useState, useEffect, useCallback, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './ProductImageGallery.css';

const ProductImageGallery = ({ images, productName, selectedIndex, onImageSelect }) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [mainImageError, setMainImageError] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const previousSelectedIndex = useRef(selectedIndex);
  const previousImageSrc = useRef(null);
  const imgRef = useRef(null);

  // Magnifier settings - using dynamic sizing
  const lensSize = 150; // Square lens size
  const zoomLevel = 2.5;

  // Handle selectedIndex changes
  useEffect(() => {
    if (previousSelectedIndex.current !== selectedIndex) {
      const newImageSrc = images && images[selectedIndex] ? images[selectedIndex] : '/api/placeholder/600/600';

      if (previousImageSrc.current !== newImageSrc) {
        setIsTransitioning(true);
        setMainImageLoaded(false);
        setMainImageError(false);
        setCurrentImageSrc(newImageSrc);
        previousImageSrc.current = newImageSrc;
        setShowMagnifier(false);

        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }

      previousSelectedIndex.current = selectedIndex;
    }
  }, [selectedIndex, images]);

  // Initialize current image source
  useEffect(() => {
    const initialSrc = images && images[selectedIndex] ? images[selectedIndex] : '/api/placeholder/600/600';
    if (currentImageSrc !== initialSrc) {
      setCurrentImageSrc(initialSrc);
      previousImageSrc.current = initialSrc;
    }
  }, [images, selectedIndex, currentImageSrc]);

  const handleMainImageLoad = useCallback(() => {
    setMainImageLoaded(true);
    setMainImageError(false);
    setIsTransitioning(false);
    
    // Update image dimensions
    if (imgRef.current) {
      const { width, height } = imgRef.current.getBoundingClientRect();
      setImgSize({ width, height });
    }
  }, []);

  const handleMainImageError = useCallback(() => {
    setMainImageError(true);
    setMainImageLoaded(false);
    setIsTransitioning(false);
    const fallbackSrc = '/api/placeholder/600/600';
    setCurrentImageSrc(fallbackSrc);
    previousImageSrc.current = fallbackSrc;
  }, []);

  const handleThumbnailClick = useCallback((index) => {
    const actualIndex = thumbnailStartIndex + index;
    if (actualIndex !== selectedIndex) {
      onImageSelect(actualIndex);
      setThumbnailStartIndex(Math.floor(actualIndex / 5) * 5);
    }
  }, [selectedIndex, onImageSelect, thumbnailStartIndex]);

  const handlePrevThumbnails = useCallback(() => {
    const newStart = Math.max(0, thumbnailStartIndex - 5);
    setThumbnailStartIndex(newStart);
    if (selectedIndex < newStart || selectedIndex >= newStart + 5) {
      onImageSelect(newStart);
    }
  }, [thumbnailStartIndex, selectedIndex, onImageSelect]);

  const handleNextThumbnails = useCallback(() => {
    if (images && images.length > 0) {
      const newStart = Math.min(images.length - 5, thumbnailStartIndex + 5);
      setThumbnailStartIndex(newStart);
      if (selectedIndex < newStart || selectedIndex >= newStart + 5) {
        onImageSelect(newStart);
      }
    }
  }, [images, thumbnailStartIndex, selectedIndex, onImageSelect]);

  const handleMouseEnter = useCallback((e) => {
    if (!mainImageLoaded || mainImageError) return;
    
    const elem = e.currentTarget;
    const { width, height } = elem.getBoundingClientRect();
    setImgSize({ width, height });
    setShowMagnifier(true);
  }, [mainImageLoaded, mainImageError]);

  const handleMouseMove = useCallback((e) => {
    if (!showMagnifier) return;

    const elem = e.currentTarget;
    const { top, left, width, height } = elem.getBoundingClientRect();

    // Calculate cursor position on image
    const x = e.pageX - left - window.pageXOffset;
    const y = e.pageY - top - window.pageYOffset;

    // Keep magnifier within bounds
    const boundedX = Math.max(0, Math.min(x, width));
    const boundedY = Math.max(0, Math.min(y, height));

    setMagnifierPosition({ x: boundedX, y: boundedY });
  }, [showMagnifier]);

  const handleMouseLeave = useCallback(() => {
    setShowMagnifier(false);
  }, []);

  const handleThumbnailError = useCallback((e) => {
    const img = e.target;
    if (img.dataset.fallbackSet) return;

    img.dataset.fallbackSet = "true";
    img.src = '/api/placeholder/100/100';
  }, []);

  const renderMainImage = () => {
    if (mainImageError) {
      return (
        <div className="main-image-placeholder">
          <span>No Image Available</span>
        </div>
      );
    }

    if (!currentImageSrc) {
      return (
        <div className="main-image-placeholder">
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <div className="main-image-wrapper">
        <div
          className={`main-image-container ${isTransitioning ? 'transitioning' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <img
            ref={imgRef}
            key={`${selectedIndex}-${currentImageSrc}`}
            src={currentImageSrc}
            alt={`${productName} - View ${selectedIndex + 1}`}
            className={`main-image ${mainImageLoaded ? 'loaded' : ''}`}
            onLoad={handleMainImageLoad}
            onError={handleMainImageError}
          />

          {/* Magnifier Lens - Square */}
          {showMagnifier && (
            <div
              className="magnifier-lens"
              style={{
                left: `${magnifierPosition.x - lensSize / 2}px`,
                top: `${magnifierPosition.y - lensSize / 2}px`,
                width: `${lensSize}px`,
                height: `${lensSize}px`,
              }}
            />
          )}

          {images && images.length > 1 && (
            <div className="image-counter">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Magnified View - Same size as main image */}
        {showMagnifier && (
          <div 
            className="magnified-view"
            style={{
              width: `${imgSize.width}px`,
              height: `${imgSize.height}px`,
            }}
          >
            <div
              className="magnified-image"
              style={{
                backgroundImage: `url('${currentImageSrc}')`,
                backgroundPosition: `${-(magnifierPosition.x * zoomLevel - imgSize.width / 2)}px ${-(magnifierPosition.y * zoomLevel - imgSize.height / 2)}px`,
                backgroundSize: `${imgSize.width * zoomLevel}px ${imgSize.height * zoomLevel}px`,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderThumbnails = () => {
    if (!images || images.length <= 1) return null;

    const visibleImages = images.slice(thumbnailStartIndex, thumbnailStartIndex + 5);
    const hasPrev = thumbnailStartIndex > 0;
    const hasNext = images.length > thumbnailStartIndex + 5;

    return (
      <div className="thumbnails-container">
        {hasPrev && (
          <button
            className="thumbnail-nav-btn prev"
            onClick={handlePrevThumbnails}
            aria-label="Previous images"
          >
            <FiChevronLeft />
          </button>
        )}
        <div className="thumbnails">
          {visibleImages.map((image, index) => {
            const actualIndex = thumbnailStartIndex + index;
            return (
              <div
                key={`${actualIndex}-${image || 'placeholder'}`}
                className={`thumbnail ${selectedIndex === actualIndex ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(index)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleThumbnailClick(index);
                  }
                }}
              >
                <img
                  src={image || '/api/placeholder/100/100'}
                  alt={`${productName} - Thumbnail ${actualIndex + 1}`}
                  onError={handleThumbnailError}
                />
              </div>
            );
          })}
        </div>
        {hasNext && (
          <button
            className="thumbnail-nav-btn next"
            onClick={handleNextThumbnails}
            aria-label="Next images"
          >
            <FiChevronRight />
          </button>
        )}
      </div>
    );
  };

  if (!images || images.length === 0) {
    return (
      <div className="product-image-gallery">
        <div className="gallery-main">
          <div className="main-image-container">
            <div className="main-image-placeholder">
              <span>No Images Available</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-image-gallery">
      <div className="gallery-main">
        {renderMainImage()}
      </div>

      {images && images.length > 1 && (
        <div className="gallery-thumbnails">
          {renderThumbnails()}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;