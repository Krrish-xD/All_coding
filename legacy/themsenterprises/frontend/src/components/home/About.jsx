import './About.css';
import { useState, useEffect } from 'react';
import { useScrollAnimate } from '../../hooks/useScrollAnimate';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const executives = [
  {
    id: 1,
    name: "Mr. Deepak Singla",
    title: "Chief Executive Officer - MS",
    image: "/images/ms-ceo.webp",
    glowColor: "red",
    startColor: "#dc2626",
    endColor: "#16a34a"
  },
  {
    id: 2,
    name: "Mrs. Meenu Singla",
    title: "Chief Executive Officer - Jaksh",
    image: "/images/jaksh-ceo.webp",
    glowColor: "green",
    startColor: "#16a34a",
    endColor: "#dc2626"
  }
];

const combinedContent = {
  companyDescription: "Our business spans two complementary divisions: MS Enterprises, established in 2009 as a leading manufacturer, wholesaler, retailer, and exporter of Garment Labels, Shirt Labels, Brand Labels, Printed Labels, Woven Labels, and Security Uniforms Labels; and Jaksh Collection, specializing in custom stationery, stickers, drinkware, and gifting items for both individual customers and businesses.",
  message: "With over 25 years of combined expertise, we lead both MS Enterprises and Jaksh Collection with a shared vision of excellence and innovation. At MS Enterprises, we focus on delivering high-quality labeling solutions to businesses, while at Jaksh Collection, we believe in the power of personalization, creating custom products that tell unique stories. Together, we continuously strive to exceed customer expectations across all our divisions."
};

const ProgressBar = ({ fillColor, trackColor, duration, isPaused, key }) => {
  const style = {
    '--fill-color': fillColor,
    '--duration': `${duration}ms`,
    animationPlayState: isPaused ? 'paused' : 'running'
  };

  return (
    <div className="progress-bar-container" style={{ backgroundColor: trackColor }}>
      <div key={key} className="progress-bar-fill" style={style}></div>
    </div>
  );
};

const About = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('about');
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [imageRef, imageClasses] = useScrollAnimate();
  const [contentRef, contentClasses] = useScrollAnimate({ threshold: 0.3 });

  // Main timer effect: This runs continuously and is never paused.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % executives.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures it runs only once.

  // Pause reset effect: This resets the pause state whenever the slide changes.
  useEffect(() => {
    setIsPaused(false);
  }, [currentIndex]);

  const currentExecutive = executives[currentIndex];

  const handleIndicatorClick = (index) => {
    setCurrentIndex(index);
    setIsPaused(true); // Pause on manual selection
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (isMobile) {
      return (
        <div className="about-content-mobile">
          <div className="about-tabs">
            <button 
              className={`about-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => handleTabClick('about')}
            >
              About Us
            </button>
            <button 
              className={`about-tab ${activeTab === 'message' ? 'active' : ''}`}
              onClick={() => handleTabClick('message')}
            >
              CEO's Message
            </button>
            <div 
              className={`tab-slider ${currentExecutive.glowColor === 'red' ? 'active-red' : 'active-green'}`}
              style={{ transform: `translateX(${activeTab === 'about' ? '0%' : '100%'})` }}
            ></div>
          </div>

          <ProgressBar 
            key={currentIndex} 
            fillColor={currentExecutive.endColor} 
            trackColor={currentExecutive.startColor} 
            duration={4000} 
            isPaused={isPaused} 
          />

          <div className="mobile-content-card">
            <div className="mobile-content-wrapper" style={{ transform: `translateX(${activeTab === 'about' ? '0%' : '-100%'})` }}>
              <div className="content-slide">
                <h4>About Our Companies</h4>
                <p>{combinedContent.companyDescription}</p>
              </div>
              <div className="content-slide">
                <h4>Message from the CEOs</h4>
                <blockquote>"{combinedContent.message}"</blockquote>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Desktop view
    return (
      <div ref={contentRef} className={`about-content ${contentClasses}`}>
        <div className="content-card">
          <h4>About Our Companies</h4>
          <p>{combinedContent.companyDescription}</p>
          <p className="mt-3">Our products are known for their unique attributes like long lasting quality, light weight, and high strength, all achieved by using the best quality materials and advanced techniques.</p>
        </div>
        <div className="ceo-message-card">
          <div className={`quote-icon ${currentExecutive.glowColor === 'red' ? 'red-bg' : 'green-bg'}`}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
            </svg>
          </div>
          <h4>Message from the CEOs</h4>
          <blockquote>"{combinedContent.message}"</blockquote>
          <div className="signature-line">
            <div className={`signature-accent ${currentExecutive.glowColor === 'red' ? 'red-bg' : 'green-bg'}`}></div>
            <span>Mr. Deepak Singla & Mrs. Meenu Singla</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="about" className="about-section">
      <div className={`about-bg-pattern ${currentExecutive.glowColor === 'red' ? 'red-glow' : 'green-glow'}`} />
      
      <div className="container about-container">
        <div ref={imageRef} className={`about-image-section ${imageClasses}`}>
          <div className={`executive-card ${currentExecutive.glowColor === 'red' ? 'red-accent' : 'green-accent'}`}>
            <div className="executive-image-wrapper">
              <img 
                key={`image-${currentExecutive.id}`}
                src={currentExecutive.image} 
                alt={`${currentExecutive.name} - ${currentExecutive.title}`} 
                className="executive-image"
              />
            </div>
            <div className="executive-info">
              <h3>{currentExecutive.name}</h3>
              <p className="executive-title">{currentExecutive.title}</p>
              <div className="title-underline"></div>
            </div>
          </div>
          <div className="key-values">
            <div className="value-card">
              <div className={`value-number ${currentExecutive.glowColor === 'red' ? 'red-text' : 'green-text'}`}>25+</div>
              <div className="value-label">Years Experience</div>
            </div>
            <div className="value-card">
              <div className={`value-number ${currentExecutive.glowColor === 'red' ? 'red-text' : 'green-text'}`}>100%</div>
              <div className="value-label">Quality Focus</div>
            </div>
          </div>
        </div>

        {renderContent()}

      </div>

      <div className="carousel-indicators">
        {executives.map((_, index) => (
          <button
            key={index}
            onClick={() => handleIndicatorClick(index)}
            className={`indicator ${index === currentIndex ? (currentExecutive.glowColor === 'red' ? 'active-red' : 'active-green') : ''}`}
            aria-label={`Go to executive ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default About;