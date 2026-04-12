'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CardData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  content: React.ReactNode;
  color: string;
}

const InteractiveCards: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cardsRef = useRef<CardData[]>([
    {
      id: 1,
      x: 50,
      y: 100,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      width: 180,
      height: 70,
      color: 'rgba(234, 88, 12, 0.1)',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>Aula ao vivo</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Módulo Avançado</div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      x: 300,
      y: 300,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      width: 180,
      height: 70,
      color: '#E0E7FF',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4F46E5' }}>Nova mensagem</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Professor Ed</div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      x: 100,
      y: 200,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      width: 160,
      height: 60,
      color: '#F0FDF4',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16A34A' }}>Feedback enviado</div>
        </div>
      ),
    },
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

      // Update positions
      cards.forEach((card, index) => {
        if (draggingRef.current === card.id) return;

        card.vx *= 0.995;
        card.vy *= 0.995;
        card.vx += (Math.random() - 0.5) * 0.005;
        card.vy += (Math.random() - 0.5) * 0.005;

        const minVelocity = 0.15;
        if (Math.abs(card.vx) < minVelocity) card.vx = card.vx >= 0 ? minVelocity : -minVelocity;
        if (Math.abs(card.vy) < minVelocity) card.vy = card.vy >= 0 ? minVelocity : -minVelocity;

        const maxVelocity = 0.6;
        card.vx = Math.max(-maxVelocity, Math.min(maxVelocity, card.vx));
        card.vy = Math.max(-maxVelocity, Math.min(maxVelocity, card.vy));

        card.x += card.vx;
        card.y += card.vy;

        if (card.x <= 0) {
          card.vx = Math.abs(card.vx);
          card.x = 0;
        } else if (card.x + card.width >= containerW) {
          card.vx = -Math.abs(card.vx);
          card.x = containerW - card.width;
        }

        if (card.y <= 0) {
          card.vy = Math.abs(card.vy);
          card.y = 0;
        } else if (card.y + card.height >= containerH) {
          card.vy = -Math.abs(card.vy);
          card.y = containerH - card.height;
        }

        const el = cardElements.current[index];
        if (el) {
          el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
        }
      });

      // Card-to-card collisions
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const c1 = cards[i];
          const c2 = cards[j];

          const dx = (c1.x + c1.width / 2) - (c2.x + c2.width / 2);
          const dy = (c1.y + c1.height / 2) - (c2.y + c2.height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Adjusted Hitbox for tighter collision (Final fine-tune)
          const minDistance = (c1.width + c2.width) / 4.2;

          if (distance < minDistance) {
            const tempVx = c1.vx;
            const tempVy = c1.vy;
            c1.vx = c2.vx * 1.05;
            c1.vy = c2.vy * 1.05;
            c2.vx = tempVx * 1.05;
            c2.vy = tempVy * 1.05;

            const overlap = minDistance - distance;
            const nx = dx / distance;
            const ny = dy / distance;
            
            if (draggingRef.current !== c1.id) {
              c1.x += nx * overlap * 0.5;
              c1.y += ny * overlap * 0.5;
            }
            if (draggingRef.current !== c2.id) {
              c2.x -= nx * overlap * 0.5;
              c2.y -= ny * overlap * 0.5;
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
      card.vx = dx * 0.2;
      card.vy = dy * 0.2;

      const index = cardsRef.current.indexOf(card);
      const el = cardElements.current[index];
      if (el) {
        el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
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
          className="floating-card glass-effect"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate3d(${card.x}px, ${card.y}px, 0)`,
            pointerEvents: 'auto',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
            transition: 'none',
            willChange: 'transform'
          }}
        >
          {card.content}
        </div>
      ))}
    </div>
  );
};

export default InteractiveCards;
