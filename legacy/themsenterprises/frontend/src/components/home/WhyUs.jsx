import './WhyUs.css';

const features = [
  {
    title: "Trusted Quality",
    description: "We ensure the highest quality standards for all our products.",
    icon: (
      <svg className="feature-icon" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M208 40H48A16 16 0 0 0 32 56v58.78c0 89.61 75.82 119.34 91 124.39a15.53 15.53 0 0 0 10 0c15.2-5.05 91-34.78 91-124.39V56a16 16 0 0 0-16-16Zm-80 173.18C114.47 208.67 48 182.49 48 114.79V56h160v58.79c0 67.7-66.47 93.88-80 98.39ZM162.34 117.66L112 168l-26.34-26.34a8 8 0 0 1 11.32-11.32L112 145.37l45.66-45.67a8 8 0 0 1 11.32 11.32Z"></path>
      </svg>
    )
  },
  {
    title: "1000+ Happy Clients",
    description: "Our top priority is your satisfaction with our products and service.",
    icon: (
      <svg className="feature-icon" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M239.2 97.29a16 16 0 0 0-13.81-11L166 81.17 142.72 25.81h0a15.95 15.95 0 0 0-29.44 0L90.07 81.17 30.61 86.32a16 16 0 0 0-9.11 28.06l45.11 39.38-13.52 58.54a16 16 0 0 0 23.84 17.34l51-31 51.11 31a16 16 0 0 0 23.84-17.34l-13.51-58.54 45.1-39.36a16 16 0 0 0 4.7-16.79ZM182.27 155l13.51 58.54-51.11-31a15.9 15.9 0 0 0-16.54 0l-51 31 13.52-58.5-45.11-39.38 59.44-5.14a16 16 0 0 0 13.35-9.75L128 32.08l23.2 55.29a16 16 0 0 0 13.35 9.75l59.44 5.14Z"></path>
      </svg>
    )
  },
  {
    title: "Fast Delivery",
    description: "Get your custom products delivered quickly and efficiently.",
    icon: (
      <svg className="feature-icon" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M247.42 117l-14-35A15.93 15.93 0 0 0 218.58 72H184V64a8 8 0 0 0-8-8H24A16 16 0 0 0 8 72v112a16 16 0 0 0 16 16h17a32 32 0 0 0 62 0h50a32 32 0 0 0 62 0h17a16 16 0 0 0 16-16v-64a7.94 7.94 0 0 0-.58-3ZM184 88h34.58l9.6 24H184ZM24 72h152v64H24Zm48 136a16 16 0 1 1 16-16 16 16 0 0 1-16 16Zm97-16a16 16 0 1 1 16-16 16 16 0 0 1-16 16Zm-48-16a32.09 32.09 0 0 0-30.29-24H103a32.09 32.09 0 0 0-30.29 24H24v-20.31a32.11 32.11 0 0 0 31 16.31h122a32.11 32.11 0 0 0 31-16.31V184Zm81 0h-17a32.09 32.09 0 0 0-30.29-24H208v20.31A32.11 32.11 0 0 0 215 184Z"></path>
      </svg>
    )
  },
  {
    title: "Pan India Service",
    description: "We deliver our quality products to every corner of the nation.",
    icon: (
      <svg className="feature-icon" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M128 32a96 96 0 1 0 96 96 96.11 96.11 0 0 0-128 0Zm0 176a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80ZM183.08 98.75a8 8 0 0 1-8.5 2.53l-24-8a8 8 0 0 1 0-15.06l24-8a8 8 0 0 1 8.5 2.53l40 40a8 8 0 0 1-11.32 11.32ZM72.92 98.75l40-40a8 8 0 0 0-8.5-2.53l-24 8a8 8 0 1 0 0 15.06l24 8a8 8 0 0 0 8.5-2.53Z"></path>
      </svg>
    )
  }
];

const WhyUs = () => {
  return (
    <section className="why-us-section">
      <div className="container">
        <div className="why-us-header">
          <h2>Why Choose Us?</h2>
          <p>Discover the advantages of partnering with us for your custom product needs.</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="icon-container">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
