import { useInView } from 'react-intersection-observer';

export const useScrollAnimate = (options = {}) => {
  const { threshold = 0.1, triggerOnce = true } = options;

  const { ref, inView } = useInView({
    threshold,
    triggerOnce,
  });

  return [ref, inView ? 'scroll-animate in-view' : 'scroll-animate'];
};
