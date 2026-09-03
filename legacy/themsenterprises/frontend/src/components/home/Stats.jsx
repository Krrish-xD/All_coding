import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import './Stats.css';

const stats = [
  {
    number: 25,
    label: "Years of Experience",
    description: "Decades of manufacturing excellence",
    suffix: "+"
  },
  {
    number: 1000,
    label: "Clients Served",
    description: "Trusted partnerships across industries",
    suffix: "+"
  },
  {
    number: 1000000,
    label: "Items Produced",
    description: "Premium quality at scale",
    suffix: "",
    format: "lakh"
  }
];

const AnimatedCounter = ({ target, duration = 2000, delay = 0, suffix = "", format = "normal" }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    if (!inView) return;
    
    const delayTimer = setTimeout(() => {
      const increment = target / (duration / 16); // 60fps
      
      const counter = setInterval(() => {
        countRef.current += increment;
        
        if (countRef.current >= target) {
          setCount(target);
          clearInterval(counter);
        } else {
          setCount(Math.floor(countRef.current));
        }
      }, 16);
      
      return () => clearInterval(counter);
    }, delay);
    
    return () => clearTimeout(delayTimer);
  }, [inView, target, duration, delay]);

  const formatNumber = (num) => {
    if (format === "lakh" && num >= 100000) {
      return `${Math.floor(num / 100000)}L+`;
    }
    return num.toLocaleString() + suffix;
  };

  return (
    <div ref={ref} className="stat-number">
      {formatNumber(count)}
    </div>
  );
};

const Stats = () => {
  const [currentGlow, setCurrentGlow] = useState('red');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGlow(prev => prev === 'red' ? 'green' : 'red');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="stats" className="stats-section">
      {/* Dynamic Background Pattern */}
      <div className={`stats-bg-pattern ${currentGlow}-glow`} />
      
      {/* Animated Geometric Elements */}
      <div className="geometric-elements">
        {/* Static dots */}
        <div className="dot dot-1" />
        <div className="dot dot-2" />
        <div className="dot dot-3" />
        <div className="dot dot-4" />
        
        {/* Floating shapes */}
        <div className="floating-shape circle-1" />
        <div className="floating-shape square-1" />
        <div className="floating-shape diamond-1" />
        
        {/* Gradient lines */}
        <div className="gradient-line line-1" />
        <div className="gradient-line line-2" />
      </div>

      <div className="container stats-container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`stat-card ${index === 1 ? 'elevated' : ''}`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Background Glow */}
              <div className={`stat-glow ${currentGlow}-accent`} />
              
              {/* Card Content */}
              <div className="stat-card-inner">
                {/* Corner Accent */}
                <div className={`corner-accent ${currentGlow}-border`} />
                
                {/* Number */}
                <AnimatedCounter 
                  target={stat.number} 
                  delay={index * 200}
                  suffix={stat.suffix}
                  format={stat.format}
                  duration={2000}
                />
                
                {/* Label */}
                <h3 className="stat-label">{stat.label}</h3>
                
                {/* Description */}
                <p className="stat-description">{stat.description}</p>
                
                {/* Bottom Accent Line */}
                <div 
                  className={`bottom-accent ${currentGlow}-gradient`}
                  style={{ animationDelay: `${0.5 + index * 0.2}s` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;