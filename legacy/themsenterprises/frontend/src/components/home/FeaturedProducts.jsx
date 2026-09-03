import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import './FeaturedProducts.css';

const categories = [
  {
    name: 'Garment Labels',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20UNIFORM%20LABELS/jaksh-image-174.webp',
    link: '/products/ms'
  },
  {
    name: 'Hang Tags',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Magnetic%20Name%20Tags/jaksh-image-2.webp',
    link: '/products/ms'
  },
  {
    name: 'Lanyards, Ribbons',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Lanyards/jaksh-image-147.webp',
    link: '/products/ms'
  },
  {
    name: 'Custom Gifts',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/KITS%20AND%20GIFTS/EMPLOYEE%20WELCOME%20GIFT/jaksh-image-103.webp',
    link: '/products/jaksh'
  },
  {
    name: 'Office Essentials',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Certificates/jaksh-image-110.webp',
    link: '/products/jaksh'
  },
  {
    name: 'Wearables',
    img: 'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-253.webp',
    link: '/products/jaksh'
  },
];

const FeaturedProducts = () => {
  return (
    <section className="categories-section">
      <div className="container">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <p className="section-description">
            Explore our corporate branding solutions and unique personalized gifts
          </p>
        </div>
        
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link to={category.link} key={index} className="category-card">
              <div className="card-background" style={{ backgroundImage: `url(${category.img})` }} />
              <div className="card-content">
                <div className="text-pill">
                  <h3 className="category-name">{category.name}</h3>
                  <div className="shop-now-link">
                    <span>Shop Now</span>
                    <FiArrowRight className="arrow-icon" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="view-all-container">
          <Link to="/products" className="view-all-button">
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
