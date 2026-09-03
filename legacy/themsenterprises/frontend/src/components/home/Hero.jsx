import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

// --- Data --- //
const msImageClasses = Array.from({ length: 26 }, (_, i) => `ms_image_${i + 1}_jpg`);
const jakshImageClasses = Array.from({ length: 50 }, (_, i) => `jaksh_image_${i + 1}_jpg`);

const SPRITE_NATIVE_WIDTH = 200; // The fixed width of sprites from the CSS

// --- Components --- //
const Columns = React.memo(function Columns({ imageClasses, spriteClass, scale, offsetY }) {
  const columns = [[], [], [], []];

  // Distribute the class names into 4 columns
  imageClasses.forEach((className, index) => {
    columns[index % 4].push(
      <div key={className} className="grid-item">
        <div
          className={`sprite ${spriteClass} ${className}`}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    );
  });

  // Duplicate for seamless scroll
  return columns.map((col, colIndex) => {
    const duplicates = col.map(child => React.cloneElement(child, { key: `dup-${child.key}` }));
    const isOffsetColumn = colIndex === 1 || colIndex === 3;
    const style = {
      transform: isOffsetColumn ? `translateY(${offsetY}px)` : 'none'
    };

    return (
      <div key={colIndex} className="scrolling-column-wrapper" style={style}>
        <div className="scrolling-column">
          {col}
          {duplicates}
        </div>
      </div>
    );
  });
});

const Hero = () => {
  const sectionRef = useRef(null);
  const gridContainerRef = useRef(null); // Ref to measure for scaling
  const [scale, setScale] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  // Effect to calculate and update the scale factor and offset
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (container.offsetWidth > 0) {
        const firstColumn = container.querySelector('.scrolling-column-wrapper');
        if (firstColumn) {
          const columnWidth = firstColumn.offsetWidth;
          const newScale = columnWidth / SPRITE_NATIVE_WIDTH;
          setScale(newScale);
          setOffsetY(columnWidth / 2); // Offset is half the responsive item's width/height
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Intersection observer to pause animation when out of view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle('hero-inview', entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="new-hero-section" aria-label="Brand showcase">
      {/* LEFT (MS) */}
      <Link to="/products?brand=ms" className="hero-link left hero-split" aria-label="View MS Enterprises products">
        <div ref={gridContainerRef} className="scrolling-grid-container up">
          <Columns imageClasses={msImageClasses} spriteClass="ms-sprite" scale={scale} offsetY={offsetY} />
        </div>
        <div className="hero-text-overlay">
          <h2>MS Enterprises</h2>
          <span className="cta-hint" aria-hidden="true">Click to view products</span>
        </div>
      </Link>

      {/* RIGHT (Jaksh) */}
      <Link to="/products?brand=jaksh" className="hero-link right hero-split" aria-label="View Jaksh products">
        <div className="scrolling-grid-container down">
          <Columns imageClasses={jakshImageClasses} spriteClass="jaksh-sprite" scale={scale} offsetY={offsetY} />
        </div>
        <div className="hero-text-overlay">
          <h2>Jaksh Collection</h2>
          <span className="cta-hint" aria-hidden="true">Click to view products</span>
        </div>
      </Link>
    </section>
  );
};

export default Hero;
