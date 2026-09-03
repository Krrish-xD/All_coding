import { useState, useEffect, useContext } from 'react';
import { FiStar, FiThumbsUp, FiUser, FiEdit3, FiCheckCircle, FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../constants/api';
import './ReviewSection.css';

const ReviewSection = ({ productId, product }) => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent, helpful, rating-high, rating-low
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    pros: [],
    cons: []
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/products/${productId}`);
      setReviews(response.data.product.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingClick = (rating) => {
    setReviewForm(prev => ({ ...prev, rating }));
    if (formErrors.rating) {
      setFormErrors(prev => ({ ...prev, rating: null }));
    }
  };

  const handleInputChange = (field, value) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!reviewForm.comment.trim()) {
      errors.comment = 'Review comment is required';
    } else if (reviewForm.comment.trim().length < 10) {
      errors.comment = 'Review must be at least 10 characters long';
    } else if (reviewForm.comment.trim().length > 1000) {
      errors.comment = 'Review must not exceed 1000 characters';
    }

    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      errors.rating = 'Please select a rating';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setError('You must be logged in to submit a review');
      return;
    }

    // Check if user already reviewed
    const existingReview = reviews.find(r => r.user?._id === user.id || r.user?.id === user.id);
    if (existingReview) {
      setError('You have already reviewed this product');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const reviewData = {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        pros: reviewForm.pros.filter(pro => pro.trim()),
        cons: reviewForm.cons.filter(con => con.trim())
      };

      await axios.post(`${API_BASE}/reviews`, {
        product: productId,
        ...reviewData
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Reset form
      setReviewForm({
        rating: 5,
        comment: '',
        pros: [],
        cons: []
      });
      setShowReviewForm(false);
      setSuccess('Thank you! Your review has been submitted successfully.');

      // Refresh reviews
      await fetchReviews();

    } catch (error) {
      console.error('Error submitting review:', error);
      setError(error.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulClick = async (reviewId) => {
    if (!user) {
      setError('Please login to mark reviews as helpful');
      return;
    }

    try {
      const review = reviews.find(r => r._id === reviewId);
      const helpfulArray = review.helpful || [];
      const userId = user.id || user._id;
      const isAlreadyHelpful = helpfulArray.some(id =>
        id === userId || id.toString() === userId.toString()
      );

      if (isAlreadyHelpful) {
        // Remove from helpful (unlike)
        await axios.delete(`${API_BASE}/reviews/${reviewId}/helpful`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        setReviews(prev => prev.map(r =>
          r._id === reviewId
            ? { ...r, helpful: helpfulArray.filter(id => id.toString() !== userId.toString()) }
            : r
        ));
      } else {
        // Add to helpful (like)
        await axios.post(`${API_BASE}/reviews/${reviewId}/helpful`, {}, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        setReviews(prev => prev.map(r =>
          r._id === reviewId
            ? { ...r, helpful: [...helpfulArray, userId] }
            : r
        ));
      }

    } catch (error) {
      console.error('Error marking review as helpful:', error);
      setError('Failed to update. Please try again.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!user) {
      setError('You must be logged in to delete a review');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this review? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      setError(null);
      await axios.delete(`${API_BASE}/reviews/${reviewId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Remove review from local state
      setReviews(prev => prev.filter(r => r._id !== reviewId));
      setSuccess('Review deleted successfully.');

      // Refresh reviews to get updated count
      await fetchReviews();

    } catch (error) {
      console.error('Error deleting review:', error);
      setError(error.response?.data?.error || 'Failed to delete review. Please try again.');
    }
  };

  const renderStars = (rating, interactive = false, onClick = null, size = 'medium') => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        interactive ? (
          <FiStar
            key={i}
            className={`review-star filled interactive ${size}`}
            onClick={() => onClick(i + 1)}
          />
        ) : (
          <FaStar key={i} className={`review-star filled ${size}`} />
        )
      );
    }

    if (hasHalfStar && !interactive) {
      stars.push(<FaStarHalfAlt key="half" className={`review-star half ${size}`} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        interactive ? (
          <FiStar
            key={`empty-${i}`}
            className={`review-star empty interactive ${size}`}
            onClick={() => onClick(fullStars + i + 1)}
          />
        ) : (
          <FaRegStar key={`empty-${i}`} className={`review-star empty ${size}`} />
        )
      );
    }

    return stars;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  };

  const getSortedReviews = () => {
    let sorted = [...reviews];
    
    switch (sortBy) {
      case 'helpful':
        sorted.sort((a, b) => (b.helpful?.length || 0) - (a.helpful?.length || 0));
        break;
      case 'rating-high':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating-low':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
    
    return sorted;
  };

  const ratingDistribution = getRatingDistribution();
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length)
    : 0;
  
  const userHasReviewed = reviews.some(r => 
    r.user?._id === user?.id || r.user?.id === user?.id
  );

  const sortedReviews = getSortedReviews();

  return (
    <div className="review-section-wrapper">
      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          <FiCheckCircle />
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      <div className="reviews-container">
        {/* Header */}
        <div className="reviews-header">
          <h2 className="reviews-title">Customer Reviews & Ratings</h2>
          
          {user && !userHasReviewed && (
            <button
              className="btn-write-review"
              onClick={() => setShowReviewForm(!showReviewForm)}
            >
              <FiEdit3 />
              Write a Review
            </button>
          )}
        </div>

        {/* Rating Overview */}
        <div className="rating-overview">
          <div className="rating-summary">
            <div className="rating-score">
              <span className="score-number">{averageRating.toFixed(1)}</span>
              <div className="score-stars">
                {renderStars(averageRating, false, null, 'large')}
              </div>
              <span className="score-text">
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = ratingDistribution[rating];
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={rating} className="rating-bar-row">
                  <span className="bar-label">{rating}</span>
                  <FiStar className="bar-star" />
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="review-form-container">
            <div className="form-card">
              <h3 className="form-title">Share Your Experience</h3>
              <p className="form-subtitle">Help others make informed decisions</p>
              
              <form onSubmit={handleSubmitReview} className="review-form">
                {/* Rating Input */}
                <div className="form-field">
                  <label className="field-label">
                    Your Rating <span className="required">*</span>
                  </label>
                  <div className="rating-selector">
                    <div className="rating-stars-input">
                      {renderStars(reviewForm.rating, true, handleRatingClick, 'large')}
                    </div>
                    <span className="rating-label">
                      {reviewForm.rating === 1 && '😞 Poor'}
                      {reviewForm.rating === 2 && '😐 Fair'}
                      {reviewForm.rating === 3 && '🙂 Good'}
                      {reviewForm.rating === 4 && '😊 Very Good'}
                      {reviewForm.rating === 5 && '🤩 Excellent'}
                    </span>
                  </div>
                  {formErrors.rating && (
                    <span className="field-error">{formErrors.rating}</span>
                  )}
                </div>

                {/* Comment Input */}
                <div className="form-field">
                  <label htmlFor="review-comment" className="field-label">
                    Your Review <span className="required">*</span>
                  </label>
                  <textarea
                    id="review-comment"
                    className={`field-textarea ${formErrors.comment ? 'error' : ''}`}
                    value={reviewForm.comment}
                    onChange={(e) => handleInputChange('comment', e.target.value)}
                    placeholder="Share your thoughts about this product... What did you like or dislike?"
                    rows={5}
                    maxLength={1000}
                  />
                  <div className="field-footer">
                    <span className="char-count">
                      {reviewForm.comment.length}/1000
                    </span>
                  </div>
                  {formErrors.comment && (
                    <span className="field-error">{formErrors.comment}</span>
                  )}
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowReviewForm(false);
                      setFormErrors({});
                      setReviewForm({ rating: 5, comment: '', pros: [], cons: [] });
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-small"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle />
                        Submit Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="reviews-list-section">
          <div className="list-header">
            <h3 className="list-title">
              All Reviews ({reviews.length})
            </h3>
            
            {reviews.length > 0 && (
              <div className="sort-controls">
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="recent">Most Recent</option>
                  <option value="helpful">Most Helpful</option>
                  <option value="rating-high">Highest Rating</option>
                  <option value="rating-low">Lowest Rating</option>
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="reviews-loading">
              <div className="spinner"></div>
              <p>Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="reviews-empty">
              <div className="empty-icon">
                <FiStar />
              </div>
              <h4>No Reviews Yet</h4>
              <p>Be the first to review this product and help others make informed decisions!</p>
              {user && !showReviewForm && (
                <button
                  className="btn-write-review"
                  onClick={() => setShowReviewForm(true)}
                >
                  <FiEdit3 />
                  Write the First Review
                </button>
              )}
            </div>
          ) : (
            <div className="reviews-list">
              {sortedReviews.map((review) => {
                const userId = user?.id || user?._id;
                const isHelpful = review.helpful?.some(id => 
                  id === userId || id?.toString() === userId?.toString()
                );

                return (
                  <div key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div className="reviewer-profile">
                        <div className="reviewer-avatar">
                          {review.user?.username?.[0]?.toUpperCase() || <FiUser />}
                        </div>
                        <div className="reviewer-info">
                          <h4 className="reviewer-name">
                            {review.user?.username || 'Anonymous User'}
                          </h4>
                          <span className="review-timestamp">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="review-rating-display">
                        {renderStars(review.rating)}
                      </div>
                    </div>

                    <div className="review-card-body">
                      <p className="review-text">{review.comment}</p>

                      {((review.pros && review.pros.length > 0) || 
                        (review.cons && review.cons.length > 0)) && (
                        <div className="review-pros-cons">
                          {review.pros && review.pros.length > 0 && (
                            <div className="pros-section">
                              <h5 className="section-title pros-title">Pros</h5>
                              <ul className="pros-list">
                                {review.pros.map((pro, index) => (
                                  <li key={index}>{pro}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {review.cons && review.cons.length > 0 && (
                            <div className="cons-section">
                              <h5 className="section-title cons-title">Cons</h5>
                              <ul className="cons-list">
                                {review.cons.map((con, index) => (
                                  <li key={index}>{con}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="review-card-footer">
                      <button
                        className={`helpful-button ${isHelpful ? 'active' : ''}`}
                        onClick={() => handleHelpfulClick(review._id)}
                        disabled={!user}
                        title={!user ? 'Login to mark as helpful' : isHelpful ? 'Remove helpful' : 'Mark as helpful'}
                      >
                        <FiThumbsUp />
                        <span>
                          {isHelpful ? 'Helpful' : 'Was this helpful?'}
                        </span>
                        {review.helpful?.length > 0 && (
                          <span className="helpful-count">
                            ({review.helpful.length})
                          </span>
                        )}
                      </button>

                      {user && (review.user?._id === user.id || review.user?.id === user.id) && (
                        <button
                          className="delete-review-button"
                          onClick={() => handleDeleteReview(review._id)}
                          title="Delete your review"
                        >
                          <FiTrash2 />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewSection;
