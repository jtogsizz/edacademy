'use client';

import { useEffect } from 'react';

const ScrollReveal: React.FC = () => {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.05, // Trigger as soon as 5% is visible
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));

    // Cleanup
    return () => {
      elements.forEach((el) => {
        observer.unobserve(el);
      });
    };
  }, []);

  return null;
};

export default ScrollReveal;
