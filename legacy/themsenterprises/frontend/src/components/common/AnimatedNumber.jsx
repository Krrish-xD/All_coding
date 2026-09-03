import React, { useState, useEffect, useRef } from 'react';

const AnimatedNumber = ({ value, format = (val) => Math.floor(val).toLocaleString() }) => {
  const [currentValue, setCurrentValue] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const startValue = 0;
    const endValue = value || 0;
    const duration = 1500; // Animation duration in ms
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const nextValue = startValue + (endValue - startValue) * percentage;
      setCurrentValue(nextValue);

      if (percentage < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure the final value is exactly the target value
        setCurrentValue(endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return <span>{format(currentValue)}</span>;
};

export default AnimatedNumber;
