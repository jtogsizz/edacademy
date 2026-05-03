'use client';

import React, { useEffect, useRef } from 'react';

interface CardData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  flag: string;
}

const InteractiveCards: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cardsRef = useRef<CardData[]>([
    { id: 1, x: 100, y: 100, vx: 0.1, vy: 0.1, size: 100, flag: '/flags/usa.png' },
    { id: 2, x: 300, y: 250, vx: -0.1, vy: 0.1, size: 110, flag: '/flags/spain.png' },
    { id: 3, x: 150, y: 400, vx: 0.1, vy: -0.1, size: 95, flag: '/flags/france.png' },
    { id: 4, x: 500, y: 150, vx: -0.1, vy: -0.1, size: 105, flag: '/flags/italy.png' },
    { id: 5, x: 600, y: 350, vx: 0.1, vy: 0.1, size: 90, flag: '/flags/germany.png' },
    { id: 6, x: 750, y: 200, vx: -0.1, vy: 0.1, size: 100, flag: '/flags/uk.png' },
  ]);

  const draggingRef = useRef<number | null>(null);
  const lastPointerPos = useRef<{ x: number, y: number } | null>(null);
  const cardElements = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let animationId: number;
    const cards = cardsRef.current;

    const update = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerW = containerRect.width;
      const containerH = containerRect.height;

      cards.forEach((card, index) => {
        if (draggingRef.current === card.id) return;

        card.vx *= 0.998;
        card.vy *= 0.998;
        card.vx += (Math.random() - 0.5) * 0.003;
        card.vy += (Math.random() - 0.5) * 0.003;

        const minVelocity = 0.1;
        const maxVelocity = 0.4;
        
        if (Math.abs(card.vx) < minVelocity) card.vx = card.vx >= 0 ? minVelocity : -minVelocity;
        if (Math.abs(card.vy) < minVelocity) card.vy = card.vy >= 0 ? minVelocity : -minVelocity;
        
        card.vx = Math.max(-maxVelocity, Math.min(maxVelocity, card.vx));
        card.vy = Math.max(-maxVelocity, Math.min(maxVelocity, card.vy));

        card.x += card.vx;
        card.y += card.vy;

        if (card.x - card.size/2 <= 0) {
          card.vx = Math.abs(card.vx);
          card.x = card.size/2;
        } else if (card.x + card.size/2 >= containerW) {
          card.vx = -Math.abs(card.vx);
          card.x = containerW - card.size/2;
        }

        if (card.y - card.size/2 <= 0) {
          card.vy = Math.abs(card.vy);
          card.y = card.size/2;
        } else if (card.y + card.size/2 >= containerH) {
          card.vy = -Math.abs(card.vy);
          card.y = containerH - card.size/2;
        }

        const el = cardElements.current[index];
        if (el) {
          el.style.transform = `translate3d(${card.x - card.size/2}px, ${card.y - card.size/2}px, 0)`;
        }
      });

      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const c1 = cards[i];
          const c2 = cards[j];

          const dx = c1.x - c2.x;
          const dy = c1.y - c2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (c1.size + c2.size) / 2;

          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const targetX = c2.x + Math.cos(angle) * minDistance;
            const targetY = c2.y + Math.sin(angle) * minDistance;
            
            const ax = (targetX - c1.x) * 0.1;
            const ay = (targetY - c1.y) * 0.1;

            if (draggingRef.current !== c1.id) {
              c1.vx += ax;
              c1.vy += ay;
              c1.x += ax;
              c1.y += ay;
            }
            if (draggingRef.current !== c2.id) {
              c2.vx -= ax;
              c2.vy -= ay;
              c2.x -= ax;
              c2.y -= ay;
            }
          }
        }
      }

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handlePointerDown = (e: React.PointerEvent, cardId: number) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    draggingRef.current = cardId;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent, cardId: number) => {
    if (draggingRef.current !== cardId || !lastPointerPos.current || !containerRef.current) return;

    const dx = e.clientX - lastPointerPos.current.x;
    const dy = e.clientY - lastPointerPos.current.y;
    
    const card = cardsRef.current.find(c => c.id === cardId);
    if (card) {
      card.x += dx;
      card.y += dy;
      card.vx = dx * 0.1;
      card.vy = dy * 0.1;

      const index = cardsRef.current.indexOf(card);
      const el = cardElements.current[index];
      if (el) {
        el.style.transform = `translate3d(${card.x - card.size/2}px, ${card.y - card.size/2}px, 0)`;
      }
    }

    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = null;
    lastPointerPos.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="hide-mobile"
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden'
      }}
    >
      {cardsRef.current.map((card, index) => (
        <div
          key={card.id}
          ref={el => { cardElements.current[index] = el; }}
          onPointerDown={(e) => handlePointerDown(e, card.id)}
          onPointerMove={(e) => handlePointerMove(e, card.id)}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: card.size,
            height: card.size,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
            transition: 'none',
            willChange: 'transform',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          <img 
            src={card.flag} 
            alt="Flag" 
            draggable={false}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '50%',
              padding: '12px',
              pointerEvents: 'none',
              userSelect: 'none'
            }} 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default InteractiveCards;
