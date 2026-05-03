'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FeedbackCarouselProps {
  images: string[];
}

const FeedbackCarousel: React.FC<FeedbackCarouselProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const total = images.length;
  
  // Responsive items per view
  const [itemsPerView, setItemsPerView] = useState(2);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(window.innerWidth < 768 ? 1 : 2);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, total - itemsPerView);

  const next = useCallback(() => {
    setActiveIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setActiveIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (total > itemsPerView) {
      autoplayRef.current = setInterval(next, 5000);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [next, total, itemsPerView]);

  const resetAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(next, 5000);
  };

  const handleStart = (clientX: number) => {
    if (total <= itemsPerView) return;
    setIsDragging(true);
    setStartX(clientX);
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setTranslateX(diff);
  };

  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    const diff = startX - clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setIsDragging(false);
    setTranslateX(0);
    resetAutoplay();
  };

  if (total === 0) {
    return (
      <div style={{ 
        padding: '4rem 2rem', 
        border: '2px dashed #E5E7EB', 
        borderRadius: '32px', 
        textAlign: 'center',
        color: '#9CA3AF',
        backgroundColor: '#F9FAFB'
      }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Adicione feedbacks reais na pasta <code style={{ backgroundColor: '#F3F4F6', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>/public/feedbacks</code>
        </p>
      </div>
    );
  }

  return (
    <div className="feedback-carousel-container" style={{ position: 'relative', width: '100%', overflow: 'hidden', padding: '2rem 0 4rem' }}>
      <div 
        className="carousel-track"
        ref={containerRef}
        style={{
          display: 'flex',
          gap: '2.5rem',
          transition: isDragging ? 'none' : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transform: `translateX(calc(-${activeIndex * (100 / itemsPerView)}% + ${translateX}px))`,
          cursor: total > itemsPerView ? (isDragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'pan-y'
        }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={(e) => handleEnd(e.clientX)}
        onMouseLeave={() => { if(isDragging) { setIsDragging(false); setTranslateX(0); resetAutoplay(); } }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX)}
      >
        {images.map((src, i) => (
          <div key={i} style={{ 
            minWidth: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 2.5 / itemsPerView}rem)`,
            flexShrink: 0
          }}>
            <div className="feedback-card" style={{ 
              borderRadius: '24px', 
              overflow: 'hidden', 
              backgroundColor: '#FFFFFF',
              border: '1px solid #F3F4F6',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: '4px', backgroundColor: '#FFFFFF' }}>
                 {[1, 2, 3, 4, 5].map(s => (
                   <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)">
                     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                   </svg>
                 ))}
              </div>
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                height: '600px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={src} 
                  alt={`Feedback ${i}`} 
                  loading="lazy"
                  draggable={false}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain', 
                    display: 'block',
                    pointerEvents: 'none'
                  }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > itemsPerView && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button 
            onClick={prev}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', border: '1px solid #F3F4F6', 
              backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.3s ease'
            }}
            className="carousel-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button 
            onClick={next}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', border: '1px solid #F3F4F6', 
              backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.3s ease'
            }}
            className="carousel-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .carousel-btn:hover {
          background-color: #0f0f0f !important;
          border-color: #0f0f0f !important;
          transform: scale(1.1);
        }
        .carousel-btn:hover svg {
          stroke: #FFFFFF !important;
        }
        .feedback-card {
          transition: transform 0.4s ease;
        }
        .feedback-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </div>
  );
};

export default FeedbackCarousel;
