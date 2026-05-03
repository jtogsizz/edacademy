'use client';

import React, { useState, useMemo } from 'react';
import PublicEventCard from './PublicEventCard';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PublicEventsClientProps {
  initialEvents: any[];
  isLogged: boolean;
}

export default function PublicEventsClient({ initialEvents, isLogged }: PublicEventsClientProps) {
  const [filter, setFilter] = useState('Todos');

  const filteredEvents = useMemo(() => {
    return initialEvents.filter(event => {
      const start = parseISO(event.start_time);
      if (filter === 'Hoje') return isToday(start);
      return true;
    });
  }, [initialEvents, filter]);

  return (
    <div style={{ backgroundColor: '#FFFFFF' }}>
      {/* 1. HERO COMPACT */}
      <section style={{ 
        padding: '8rem 1.5rem 4rem', 
        textAlign: 'center',
        background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ 
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(234, 88, 12, 0.08)',
            color: 'var(--primary)',
            borderRadius: '99px',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.5rem'
          }}>
            Eventos Gratuitos EdAcademy
          </span>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 3.8rem)', 
            fontWeight: 900, 
            color: '#0f0f0f',
            letterSpacing: '-0.05em',
            lineHeight: 1.1,
            marginBottom: '1.5rem'
          }}>
            Participe ao vivo e evolua com professores reais
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#4B5563', 
            maxWidth: '600px', 
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 500
          }}>
            Aulas abertas e encontros ao vivo exclusivos para impulsionar seu aprendizado.
          </p>
        </div>
      </section>

      {/* 2. FILTROS & CONTEÚDO */}
      <section style={{ padding: '2rem 1.5rem 8rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          
          {/* FILTROS VISUAIS */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            marginBottom: '4rem'
          }}>
            {['Todos', 'Hoje'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '99px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  border: '1px solid',
                  cursor: 'pointer',
                  backgroundColor: filter === f ? '#0f0f0f' : '#FFFFFF',
                  color: filter === f ? '#FFFFFF' : '#4B5563',
                  borderColor: filter === f ? '#0f0f0f' : '#E5E7EB',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* LISTA DE EVENTOS */}
          {filteredEvents.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', 
              gap: '2.5rem' 
            }}>
              {filteredEvents.map((event: any) => (
                <PublicEventCard 
                  key={event.id} 
                  event={event} 
                  isLogged={isLogged}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '6rem 2rem', border: '1px dashed #E5E7EB', borderRadius: '32px' }}>
              <p style={{ color: '#9CA3AF', fontSize: '1.1rem', fontWeight: 500 }}>Nenhum evento encontrado para este filtro.</p>
              <button 
                onClick={() => setFilter('Todos')}
                style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Ver todos os eventos
              </button>
            </div>
          )}

          {/* 3. PROVA SOCIAL */}
          <div style={{ 
            marginTop: '8rem', 
            textAlign: 'center',
            padding: '4rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '48px',
            border: '1px solid #F3F4F6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(s => <svg key={s} width="24" height="24" viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
            </div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1rem', color: '#0f0f0f' }}>
              +200 alunos já aceleraram seu aprendizado
            </h3>
            <p style={{ color: '#6B7280', fontSize: '1.1rem', fontWeight: 500 }}>
              "As aulas da EdAcademy mudaram minha forma de estudar. Conteúdo direto e prático!"
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .whatsapp-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(37, 211, 102, 0.3);
        }
        @media (max-width: 768px) {
          .container { padding: 0 1.5rem; }
          h1 { font-size: 2.2rem !important; }
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
