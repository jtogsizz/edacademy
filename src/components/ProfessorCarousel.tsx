"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

export interface Professor {
  name: string;
  role: string;
  image: string;
}

interface ProfessorCarouselProps {
  professors: Professor[];
}

const ProfessorCarousel: React.FC<ProfessorCarouselProps> = ({ professors }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    if (professors.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % professors.length);
  }, [professors.length]);

  const prevSlide = useCallback(() => {
    if (professors.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + professors.length) % professors.length);
  }, [professors.length]);

  // Autoplay
  useEffect(() => {
    if (professors.length === 0) return;
    autoplayRef.current = setInterval(nextSlide, 5000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [nextSlide, professors.length]);

  const resetAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(nextSlide, 5000);
  };

  const handlePrev = () => {
    prevSlide();
    resetAutoplay();
  };

  const handleNext = () => {
    nextSlide();
    resetAutoplay();
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  if (!professors || professors.length === 0) {
    return null;
  }

  return (
    <div className="carousel-container">
      <div 
        className="carousel-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {professors.map((prof, index) => {
          let position = 'next';
          if (index === activeIndex) position = 'active';
          else if (
            index === (activeIndex - 1 + professors.length) % professors.length
          ) position = 'prev';

          return (
            <div 
              key={index} 
              className={`carousel-card ${position}`}
              onClick={() => {
                if (position !== 'active') {
                   setActiveIndex(index);
                   resetAutoplay();
                }
              }}
            >
              <div className="card-image-wrapper">
                <img
                  src={prof.image}
                  alt={prof.name}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover' 
                  }}
                  loading={position === 'active' ? 'eager' : 'lazy'}
                />
              </div>

              <div className="card-info">
                <h3>{prof.name}</h3>
                <p>{prof.role}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="carousel-controls">
        <button className="control-btn" onClick={handlePrev} aria-label="Anterior">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="carousel-dots">
          {professors.map((_, i) => (
            <span 
              key={i} 
              className={`dot ${i === activeIndex ? 'active' : ''}`}
              onClick={() => {
                setActiveIndex(i);
                resetAutoplay();
              }}
            />
          ))}
        </div>
        <button className="control-btn" onClick={handleNext} aria-label="Próximo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <style jsx>{`
        .carousel-container {
          position: relative;
          width: 100%;
          perspective: 1000px;
          padding: 1rem 0;
        }

        .carousel-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 420px;
          transform-style: preserve-3d;
        }

        .carousel-card {
          position: absolute;
          width: 260px;
          height: 380px;
          background: #fff;
          border-radius: var(--radius-xl);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
        }

        /* 3D Positions - Subtle translate to fit column */
        .carousel-card.active {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0) scale(1) translateZ(0);
          z-index: 10;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        }

        .carousel-card.prev {
          opacity: 0.6;
          pointer-events: auto;
          transform: translateX(-45%) scale(0.8) rotateY(15deg);
          z-index: 5;
          filter: blur(1px);
        }

        .carousel-card.next {
          opacity: 0.6;
          pointer-events: auto;
          transform: translateX(45%) scale(0.8) rotateY(-15deg);
          z-index: 5;
          filter: blur(1px);
        }

        .card-image-wrapper {
          position: relative;
          width: 100%;
          height: 70%;
          background: var(--border);
        }

        .card-info {
          padding: 1.5rem;
          text-align: center;
          background: #fff;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .card-info h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.25rem;
        }

        .card-info p {
          font-size: 0.95rem;
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .carousel-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          margin-top: 2rem;
        }

        .control-btn {
          background: #fff;
          border: 1px solid var(--border);
          color: var(--text-main);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .control-btn:hover {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .carousel-dots {
          display: flex;
          gap: 0.5rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          cursor: pointer;
          transition: all 0.3s;
        }

        .dot.active {
          width: 24px;
          border-radius: 4px;
          background: var(--primary);
        }

        @media (max-width: 768px) {
          .carousel-wrapper {
            height: 480px;
          }
          .carousel-card {
            width: 280px;
            height: 420px;
          }
          .carousel-card.prev {
            transform: translateX(-80%) scale(0.75) rotateY(10deg);
            opacity: 0; /* Hide side cards on mobile to focus on center */
          }
          .carousel-card.next {
            transform: translateX(80%) scale(0.75) rotateY(-10deg);
            opacity: 0;
          }
           .carousel-card.active {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessorCarousel;
