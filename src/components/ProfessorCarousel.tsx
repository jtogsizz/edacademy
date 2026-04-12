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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
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

  // Unified Drag/Swipe Logic
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };

  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    const diff = startX - clientX;
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    setIsDragging(false);
    resetAutoplay();
  };

  if (!professors || professors.length === 0) {
    return null;
  }

  return (
    <div className="carousel-container">
      <div 
        className={`carousel-wrapper ${isDragging ? 'dragging' : ''}`}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX)}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseUp={(e) => handleEnd(e.clientX)}
        onMouseLeave={() => setIsDragging(false)}
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
                  draggable="false"
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    userSelect: 'none'
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
      </div>

      <style jsx>{`
        .carousel-container {
          position: relative;
          width: 100%;
          perspective: 1000px;
          padding: 1rem 0;
          user-select: none;
        }

        .carousel-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 420px;
          transform-style: preserve-3d;
          cursor: grab;
        }

        .carousel-wrapper.dragging {
          cursor: grabbing;
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
          pointer-events: none;
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
          margin-top: 2rem;
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
            transform: translateX(-50%) scale(0.75) rotateY(10deg);
            opacity: 0.3;
            z-index: 5;
          }
          .carousel-card.next {
            transform: translateX(50%) scale(0.75) rotateY(-10deg);
            opacity: 0.3;
            z-index: 5;
          }
           .carousel-card.active {
            transform: translateX(0) scale(1);
            opacity: 1;
            z-index: 10;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessorCarousel;
