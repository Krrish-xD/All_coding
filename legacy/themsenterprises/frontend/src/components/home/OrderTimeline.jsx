import { useEffect, useRef, useState } from 'react';
import './OrderTimeline.css';

const timelineData = [
  { title: "1. Analyse Your Demand", description: "Identify the type of label you need, desired quality, and specifics for your garments." },
  { title: "2. Clear Doubts", description: "Contact us with any questions. Our team will help you choose the best options for your needs." },
  { title: "3. Place Your Order", description: "Trust our expertise. Specify the size and quantity of labels you require for a seamless process." },
  { title: "4. Check Design Customisation", description: "Review the custom design we create. Provide feedback for any changes to match your vision." },
  { title: "5. Receive Your Delivery", description: "Sit back and relax. We'll deliver your high-quality labels within a few days." }
];

const TimelineItem = ({ data, isActive, dotRef, index, activeIndex }) => {
  const isEven = index % 2 !== 0; // 0-indexed, so item 2 is index 1 (odd)
  const isPast = index < activeIndex;
  const isFuture = index > activeIndex;

  return (
    <div className={`timeline-item ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''} ${isEven ? 'even' : 'odd'}`}>
      <div className="timeline-dot" ref={dotRef}></div>
      <div className="timeline-spacer"></div>
      <div className="timeline-content-wrapper">
        <div className="timeline-content">
          <h3 className="font-semibold text-xl mb-2 text-main-red">{data.title}</h3>
          <p>{data.description}</p>
        </div>
      </div>
    </div>
  );
};

const OrderTimeline = () => {
  // Start at -1 so the FIRST CARD IS BLURRED initially
  const [activeItem, setActiveItem] = useState(-1);

  const containerRef = useRef(null);
  const svgPathRef = useRef(null);
  const dotRefs = useRef([]);

  // Tuning knobs
  const TRIGGER_FACTOR = 0.68; // where in the viewport the "line head" is (0.5=center, 0.68=lower)
  const SPEED_FACTOR = 0.95;   // >1 = faster, <1 = slower

  useEffect(() => {
    dotRefs.current = dotRefs.current.slice(0, timelineData.length);
  }, []);

  const updatePath = () => {
    if (!svgPathRef.current || dotRefs.current.length === 0 || !containerRef.current) return;

    const isMobile = window.innerWidth < 768;
    let pathData = '';
    const containerRect = containerRef.current.getBoundingClientRect();

    dotRefs.current.forEach((dot, index) => {
      if (!dot) return;
      const dotRect = dot.getBoundingClientRect();
      const x = dotRect.left - containerRect.left + (dotRect.width / 2);
      const y = dotRect.top - containerRect.top + (dotRect.height / 2);

      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        const prevDot = dotRefs.current[index - 1];
        if (!prevDot) return;
        const prevDotRect = prevDot.getBoundingClientRect();
        const prevY = prevDotRect.top - containerRect.top + (prevDotRect.height / 2);

        if (isMobile) {
          pathData += ` L ${x} ${y}`;
        } else {
          const prevX = prevDotRect.left - containerRect.left + (prevDotRect.width / 2);
          const curveFactor = 80;
          const cpx1 = prevX + curveFactor * (index % 2 === 0 ? -1 : 1);
          const cpy1 = prevY + (y - prevY) / 2;
          const cpx2 = x - curveFactor * (index % 2 === 0 ? -1 : 1);
          const cpy2 = y - (y - prevY) / 2;

          pathData += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${x} ${y}`;
        }
      }
    });

    svgPathRef.current.setAttribute('d', pathData);
    const pathLength = svgPathRef.current.getTotalLength();
    svgPathRef.current.style.strokeDasharray = String(pathLength);
    svgPathRef.current.style.strokeDashoffset = String(pathLength);
  };

  const handleScroll = () => {
    if (!containerRef.current || !svgPathRef.current || dotRefs.current.length === 0) return;
  
    const viewportHeight = window.innerHeight;
    const triggerY = viewportHeight * TRIGGER_FACTOR;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pathLength = svgPathRef.current.getTotalLength();
  
    const dotPositions = dotRefs.current.map(dot => {
      const rect = dot.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
  
    // Before first dot → hidden
    if (dotPositions[0] > triggerY) {
      svgPathRef.current.style.strokeDashoffset = String(pathLength);
      setActiveItem(-1);
      containerRef.current.style.setProperty('--scroll-progress', '0');
      return;
    }
  
    // After last dot → full
    const atEnd = containerRect.bottom <= viewportHeight + 1;
    if (atEnd || dotPositions[dotPositions.length - 1] <= triggerY) {
      svgPathRef.current.style.strokeDashoffset = '0';
      setActiveItem(dotPositions.length - 1);
      containerRef.current.style.setProperty('--scroll-progress', '1');
      return;
    }
  
    // --- FIX: proportional with min segment size ---
    const segmentLengths = [];
    let totalLength = 0;
    const MIN_SEGMENT = 80; // px "virtual" length to prevent instant jumps
  
    for (let i = 0; i < dotPositions.length - 1; i++) {
      const segLen = Math.max(dotPositions[i + 1] - dotPositions[i], MIN_SEGMENT);
      segmentLengths.push(segLen);
      totalLength += segLen;
    }
  
    let scrolled = triggerY - dotPositions[0];
    let covered = 0;
    let segmentIndex = 0;
  
    while (segmentIndex < segmentLengths.length && scrolled > segmentLengths[segmentIndex]) {
      scrolled -= segmentLengths[segmentIndex];
      covered += segmentLengths[segmentIndex];
      segmentIndex++;
    }
  
    if (segmentIndex < segmentLengths.length) {
      scrolled / segmentLengths[segmentIndex];
    }
  
    let progress = (covered + scrolled) / totalLength;
  
    // Apply speed factor
    progress = Math.max(0, Math.min(1, progress * SPEED_FACTOR));
  
    svgPathRef.current.style.strokeDashoffset = String(pathLength - (pathLength * progress));
  
    // Activate dots up to current
    let lastPassed = -1;
    for (let i = 0; i < dotPositions.length; i++) {
      if (dotPositions[i] <= triggerY) lastPassed = i;
    }
    setActiveItem(lastPassed);
  
    containerRef.current.style.setProperty('--scroll-progress', String(progress));
  };
  
  

  useEffect(() => {
    const handleResize = () => {
      updatePath();
      handleScroll();
    };

    // Initial layout + first paint
    setTimeout(() => {
      updatePath();
      handleScroll();
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section id="order" className="timeline-section">
      <div className="container">
        <h2>How to Place Your Order</h2>
        <div className="timeline-container" ref={containerRef}>
          <svg className="timeline-svg">
            <path ref={svgPathRef} fill="none" stroke="var(--main-red)" strokeWidth="4" strokeLinecap="round"></path>
          </svg>
          {timelineData.map((item, index) => (
            <TimelineItem
              data={item}
              key={index}
              index={index}
              isActive={index === activeItem}
              dotRef={el => (dotRefs.current[index] = el)}
              activeIndex={activeItem}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default OrderTimeline;