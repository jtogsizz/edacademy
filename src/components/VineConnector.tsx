'use client';

import React from 'react';

const VineConnector: React.FC = () => {
  return (
    <div className="vine-container reveal">
      <svg 
        width="60" 
        height="120" 
        viewBox="0 0 60 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="vine-svg"
      >
        {/* Main vine body - organic curve */}
        <path 
          d="M30 0 C 45 40, 15 80, 30 120" 
          stroke="#5D4037" 
          strokeWidth="3.5" 
          strokeLinecap="round"
          strokeDasharray="1 4"
        />
        <path 
          d="M30 0 C 45 40, 15 80, 30 120" 
          stroke="#795548" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        
        {/* Small nodes / leaves details */}
        <circle cx="36" cy="30" r="3" fill="#5D4037" />
        <circle cx="22" cy="65" r="2.5" fill="#8D6E63" />
        <circle cx="34" cy="95" r="3" fill="#5D4037" />
        
        {/* Subtle highlights */}
        <path 
          d="M31 10 C 35 30, 25 50, 31 70" 
          stroke="rgba(255, 255, 255, 0.2)" 
          strokeWidth="0.8" 
          strokeLinecap="round"
        />
      </svg>

      <style jsx>{`
        .vine-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 1.5rem 0;
          perspective: 1000px;
        }
        .vine-svg {
          transform-origin: top center;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }
        /* Desktop: Hover animation */
        .vine-container:hover .vine-svg {
          animation: vineSwing 2s ease-in-out infinite alternate;
        }
        /* Mobile: Default subtle animation or on touch */
        @media (max-width: 768px) {
          .vine-svg {
            animation: vineSwingMobile 4s ease-in-out infinite alternate;
          }
        }
        @keyframes vineSwing {
          0% { transform: rotate(-3deg) skewX(-1deg); }
          100% { transform: rotate(3deg) skewX(1deg); }
        }
        @keyframes vineSwingMobile {
          0% { transform: rotate(-1.5deg); }
          100% { transform: rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
};

export default VineConnector;
