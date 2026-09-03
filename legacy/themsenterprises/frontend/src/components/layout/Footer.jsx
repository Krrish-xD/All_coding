import { useState } from 'react';
import { FiPhone, FiMail, FiMapPin, FiInstagram, FiChevronDown, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext'; // Import the hook
import './Footer.css';

const AccordionSection = ({ title, children, name, openAccordion, toggleAccordion }) => {
  const isOpen = openAccordion === name;

  return (
    <div className="footer-section">
      <button className="accordion-header" onClick={() => toggleAccordion(name)}>
        <h3>{title}</h3>
        <FiChevronDown className={`accordion-icon ${isOpen ? 'open' : ''}`} />
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { settings, loading } = useSettings(); // Use the settings context
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isLegalOpen, setLegalOpen] = useState(false);
  const [infoToShow, setInfoToShow] = useState(null);

  const toggleAccordion = (section) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  const handleQuickActionClick = (infoType) => {
    setInfoToShow(infoToShow === infoType ? null : infoType);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    console.log('Subscribe email:', email);
    e.target.reset();
  };

  // Render a loading state or placeholder if settings are not yet available
  if (loading) {
    return <footer className="footer-loading">Loading Footer...</footer>;
  }

  const InfoBox = () => {
    let content;
    switch (infoToShow) {
      case 'phone':
        content = (
          <div className="info-box-links-container">
            {settings?.businessPhone && <a href={`tel:${settings.businessPhone}`} className="info-box-link">{settings.businessPhone}</a>}
            {settings?.businessPhone2 && <a href={`tel:${settings.businessPhone2}`} className="info-box-link">{settings.businessPhone2}</a>}
            {!settings?.businessPhone && !settings?.businessPhone2 && <span>Phone not available</span>}
          </div>
        );
        break;
      case 'email':
        content = <a href={`mailto:${settings?.businessEmail}`} className="info-box-link">{settings?.businessEmail || 'Email not available'}</a>;
        break;
      case 'location':
        content = <a href={`https://www.google.com/maps?q=${encodeURIComponent(settings?.businessAddress)}`} target="_blank" rel="noopener noreferrer" className="info-box-link">{settings?.businessAddress || 'Address not available'}</a>;
        break;
      default:
        content = null;
    }

    return (
      <div className={`info-box ${infoToShow ? 'open' : ''}`}>
        <div className="info-box-content">{content}</div>
        <button onClick={() => setInfoToShow(null)} className="info-box-close"><FiX /></button>
      </div>
    );
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid footer-desktop-view">
          <div className="footer-section company-section">
            <h2 className="footer-title">{settings?.businessName || 'MS Enterprises'}</h2>
            <p className="footer-description">
              Your trusted partner for premium corporate solutions, promotional merchandise, and professional services.
            </p>
            <div className="subsidiary-info">
              <h3 className="subsidiary-title">Jaksh Collection</h3>
              <p className="subsidiary-description">
                A subsidiary specializing in custom stationery, creative stickers, and unique gifting solutions.
              </p>
            </div>
            <div className="social-section">
              <h3>Follow Us</h3>
              <div className="social-links-vertical">
                <a href="https://www.instagram.com/the.msenterprises" className="social-link-card" target="_blank" rel="noopener noreferrer">
                  <FiInstagram className="social-icon" />
                  <span>MS Enterprises</span>
                </a>
                <a href="https://www.instagram.com/the.jakshcollection" className="social-link-card" target="_blank" rel="noopener noreferrer">
                  <FiInstagram className="social-icon" />
                  <span>Jaksh Collection</span>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-column-merged">
            <AccordionSection title="Contact Information" name="contact" openAccordion={openAccordion} toggleAccordion={toggleAccordion}>
              <div className="contact-cards">
                <div className="contact-card">
                  <div className="contact-icon-wrapper"><FiPhone className="contact-icon" /></div>
                  <div className="contact-details">
                    <a href={`tel:${settings?.businessPhone}`}>{settings?.businessPhone || 'Phone not available'}</a>
                  </div>
                </div>
                {settings?.businessPhone2 && (
                  <div className="contact-card">
                    <div className="contact-icon-wrapper"><FiPhone className="contact-icon" /></div>
                    <div className="contact-details">
                      <a href={`tel:${settings.businessPhone2}`}>{settings.businessPhone2}</a>
                    </div>
                  </div>
                )}
                <div className="contact-card">
                  <div className="contact-icon-wrapper"><FiMail className="contact-icon" /></div>
                  <div className="contact-details">
                    <a href={`mailto:${settings?.businessEmail}`}>{settings?.businessEmail || 'Email not available'}</a>
                  </div>
                </div>
                <div className="contact-card">
                  <div className="contact-icon-wrapper"><FiMapPin className="contact-icon" /></div>
                  <div className="contact-details">
                    <a href={`https://www.google.com/maps?q=${encodeURIComponent(settings?.businessAddress)}`} target="_blank" rel="noopener noreferrer">
                      {settings?.businessAddress || 'Address not available'}
                    </a>
                  </div>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Subscribe to Our Newsletter" name="newsletter" openAccordion={openAccordion} toggleAccordion={toggleAccordion}>
              <p className="section-subtitle">Stay updated with our latest products and exclusive offers.</p>
              <form onSubmit={handleSubscribe} className="newsletter-form">
                <input type="email" name="email" placeholder="Enter your email address" className="newsletter-input" required />
                <button type="submit" className="newsletter-button">Subscribe</button>
              </form>
              <p className="privacy-note">* We respect your privacy and never share your email.</p>
            </AccordionSection>
          </div>
        </div>

        <div className="footer-mobile-view">
          <h2 className="footer-title">{settings?.businessName || 'MS Enterprises'}</h2>
          <div className="quick-actions-container">
            <div className="quick-actions-bar">
              <button onClick={() => handleQuickActionClick('phone')} className="quick-action-item"><FiPhone /><span>Call Us</span></button>
              <button onClick={() => handleQuickActionClick('email')} className="quick-action-item"><FiMail /><span>Email</span></button>
              <button onClick={() => handleQuickActionClick('location')} className="quick-action-item"><FiMapPin /><span>Locate</span></button>
            </div>
            <InfoBox />
          </div>
          <div className="mobile-social-section">
            <h3>Follow Us</h3>
            <div className="mobile-social-links">
              <a href="https://www.instagram.com/the.msenterprises" className="mobile-social-link-card" target="_blank" rel="noopener noreferrer"><FiInstagram /><span>MS Enterprises</span></a>
              <a href="https://www.instagram.com/the.jakshcollection" className="mobile-social-link-card" target="_blank" rel="noopener noreferrer"><FiInstagram /><span>Jaksh Collection</span></a>
            </div>
          </div>
          <div className="mobile-newsletter-section">
            <h3>Subscribe</h3>
            <form onSubmit={handleSubscribe} className="newsletter-form-mobile">
              <input type="email" name="email" placeholder="Your email address" className="newsletter-input" required />
              <button type="submit" className="newsletter-button">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="bottom-content">
            <div className="mobile-legal-section">
              <button className="legal-toggle" onClick={() => setLegalOpen(!isLegalOpen)}>
                <span>Legal Information</span>
                <FiChevronDown className={`accordion-icon ${isLegalOpen ? 'open' : ''}`} />
              </button>
              {isLegalOpen && (
                <div className="legal-links-mobile">
                  <Link to="/terms" className="legal-link">Terms & Conditions</Link>
                  <Link to="/privacy" className="legal-link">Privacy Policy</Link>
                </div>
              )}
            </div>
            <div className="copyright-text">
              © {new Date().getFullYear()} {settings?.businessName || 'MS Enterprises'}. All rights reserved.
            </div>
            <div className="legal-links legal-links-desktop">
              <Link to="/terms" className="legal-link">Terms & Conditions</Link>
              <Link to="/privacy" className="legal-link">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;