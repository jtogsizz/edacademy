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
          perspective: 1500px;
          padding: 3rem 0;
          user-select: none;
          overflow: visible;
        }

        .carousel-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 450px;
          transform-style: preserve-3d;
          cursor: grab;
        }

        .carousel-wrapper.dragging {
          cursor: grabbing;
        }

        .carousel-card {
          position: absolute;
          width: 280px;
          height: 400px;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          transition: all 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.5);
          backface-visibility: hidden;
        }

        /* 3D Positions with better depth and blur */
        .carousel-card.active {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0) scale(1.05) translateZ(100px);
          z-index: 10;
          box-shadow: 0 30px 60px rgba(0,0,0,0.2);
          filter: blur(0);
        }

        .carousel-card.prev {
          opacity: 0.7;
          pointer-events: auto;
          transform: translateX(-55%) scale(0.85) rotateY(25deg) translateZ(0);
          z-index: 5;
          filter: blur(4px);
        }

        .carousel-card.next {
          opacity: 0.7;
          pointer-events: auto;
          transform: translateX(55%) scale(0.85) rotateY(-25deg) translateZ(0);
          z-index: 5;
          filter: blur(4px);
        }

        .card-image-wrapper {
          position: relative;
          width: 100%;
          height: 75%;
          background: #f3f4f6;
          pointer-events: none;
          overflow: hidden;
        }

        .card-image-wrapper::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(to top, rgba(255,255,255,1), transparent);
          z-index: 1;
        }

        .card-info {
          padding: 1.25rem;
          text-align: center;
          background: #fff;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .card-info h3 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 0.2rem;
          letter-spacing: -0.02em;
        }

        .card-info p {
          font-size: 0.9rem;
          color: var(--primary);
          font-weight: 700;
          margin-bottom: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .carousel-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .carousel-dots {
          display: flex;
          gap: 0.75rem;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e5e7eb;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .dot.active {
          width: 32px;
          border-radius: 5px;
          background: var(--primary);
        }

        @media (max-width: 768px) {
          .carousel-wrapper {
            height: 400px;
          }
          .carousel-card {
            width: 240px;
            height: 360px;
          }
          .carousel-card.prev {
            transform: translateX(-45%) scale(0.75) rotateY(20deg);
            opacity: 0.4;
          }
          .carousel-card.next {
            transform: translateX(45%) scale(0.75) rotateY(-20deg);
            opacity: 0.4;
          }
          .carousel-card.active {
            transform: translateX(0) scale(1) translateZ(50px);
          }
        }
      `}</style>

    </div>
  );
};

export default ProfessorCarousel;
