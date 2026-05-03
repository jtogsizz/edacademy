import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'
import ProfessorCarousel, { Professor } from '@/components/ProfessorCarousel'
import InteractiveCards from '@/components/InteractiveCards'
import ScrollReveal from '@/components/ScrollReveal'
import Footer from '@/components/Footer'
import PublicHeader from '@/components/PublicHeader'
import FeedbackCarousel from '@/components/FeedbackCarousel'
import fs from 'fs'
import path from 'path'

export default function Home() {
  // Configuração dos professores
  const professorsData = [
    { name: 'Ed', role: 'English teacher', filename: 'professor1.png' },
    { name: 'João', role: 'Developer', filename: 'professor2.png' },
    { name: 'Melissa', role: 'Support', filename: 'professor3.png' },
  ]

  const professors: Professor[] = professorsData.map((prof) => {
    const filePath = path.join(process.cwd(), 'public', 'images', 'professores', prof.filename)
    let version = '1'
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        version = stats.mtimeMs.toString()
      }
    } catch (error) {
      console.error(`Erro ao ler mtime para ${prof.filename}:`, error)
    }
    return {
      name: prof.name,
      role: prof.role,
      image: `/images/professores/${prof.filename}?v=${version}`
    }
  })

  // Leitura dinâmica dos feedbacks (prints reais)
  const feedbackDir = path.join(process.cwd(), 'public', 'feedbacks')
  let feedbackImages: string[] = []
  try {
    if (fs.existsSync(feedbackDir)) {
      feedbackImages = fs.readdirSync(feedbackDir)
        .filter(f => f.match(/\.(png|jpe?g|webp)$/i))
        .map(f => `/feedbacks/${f}`)
    }
  } catch (e) {
    console.error('Erro ao ler diretório de feedbacks:', e)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', backgroundColor: '#FFFFFF' }}>

      <ScrollReveal />
      <PublicHeader />

      {/* 1. HERO SECTION - ULTRA MINIMALIST & PREMIUM */}
      <section style={{
        padding: '0 1.5rem',
        textAlign: 'center',
        background: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #F3F4F6'
      }}>
        <InteractiveCards />

        <div className="container" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{ marginBottom: '3rem', opacity: 0, animation: 'fadeInDown 1.2s forwards' }}>
            <Logo width={120} />
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            fontWeight: 900,
            marginBottom: '1.5rem',
            letterSpacing: '-0.06em',
            lineHeight: 1,
            color: '#0f0f0f',
            opacity: 0,
            animation: 'fadeInUp 1s forwards 0.3s'
          }}>
            Fluência com acompanhamento <span style={{ color: 'var(--primary)' }}>individual.</span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: '#6B7280',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            opacity: 0,
            animation: 'fadeInUp 1s forwards 0.6s'
          }}>
            Inglês com estratégia real.
          </p>
        </div>
      </section>

      {/* 2. EQUIPE SECTION */}
      <section className="reveal" style={{ padding: '12rem 1.5rem', backgroundColor: '#FFFFFF' }}>
        <div className="container" style={{ maxWidth: '1100px', textAlign: 'center' }}>
          <span style={{ color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.2em', marginBottom: '1.5rem', display: 'block' }}>
            Autoridade no Ensino
          </span>
          <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', marginBottom: '5rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f0f0f' }}>
            Quem acompanha sua <span style={{ color: 'var(--primary)' }}>evolução</span>
          </h2>

          <div style={{ position: 'relative', width: '100%', maxWidth: '850px', margin: '0 auto' }}>
            <ProfessorCarousel professors={professors} />
          </div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA SECTION */}
      <section className="reveal" style={{ padding: '12rem 1.5rem', backgroundColor: '#F9FAFB' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '7rem' }}>
            <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.2rem)', fontWeight: 900, marginBottom: '2rem', color: '#0f0f0f', letterSpacing: '-0.04em' }}>
              Um método <span style={{ color: 'var(--primary)' }}>simples</span> para resultados complexos
            </h2>
            <p style={{ color: '#4B5563', fontSize: '1.2rem', maxWidth: '650px', marginInline: 'auto', fontWeight: 500 }}>
              Desenhamos uma jornada fluida para que você foque apenas no que importa: aprender.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem'
          }}>
            {[
              {
                step: '01',
                title: 'Diagnóstico de Nível',
                desc: 'Analisamos não apenas o que você sabe, mas como você aprende, para criar o roteiro ideal.'
              },
              {
                step: '02',
                title: 'Foco em Conversão',
                desc: 'Aulas desenhadas para você usar o idioma no mundo real, com feedback imediato e personalizado.'
              },
              {
                step: '03',
                title: 'Suporte Multi-canal',
                desc: 'Acesso direto ao seu professor e à plataforma para tirar dúvidas a qualquer momento do dia.'
              }
            ].map((item, i) => (
              <div key={i} className="card item-card" style={{ padding: '4rem 3rem', borderRadius: '32px', backgroundColor: '#FFFFFF', position: 'relative', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{
                  fontSize: '5rem',
                  fontWeight: 900,
                  color: '#F3F4F6',
                  position: 'absolute',
                  top: '1.5rem',
                  right: '2.5rem',
                  lineHeight: 1
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '1.5rem', position: 'relative', color: '#0f0f0f' }}>{item.title}</h3>
                <p style={{ color: '#6B7280', lineHeight: 1.7, fontSize: '1.05rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. RESULTADOS REAIS (Feedbacks Prints) */}
      <section className="reveal" style={{ padding: '12rem 1.5rem', backgroundColor: '#FFFFFF' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.2em', marginBottom: '1.5rem', display: 'block' }}>
              Provas Sociais
            </span>
            <h2 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.2rem)', fontWeight: 900, color: '#0f0f0f', letterSpacing: '-0.04em' }}>
              Resultados reais de <span style={{ color: 'var(--primary)' }}>alunos</span>
            </h2>
          </div>

          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <FeedbackCarousel images={feedbackImages} />
          </div>
        </div>
      </section>

      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 1.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
        .reveal.active {
          opacity: 1;
          transform: translateY(0);
        }
        .card {
          transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .item-card:hover {
          transform: translateY(-16px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.06) !important;
          border-color: var(--primary) !important;
        }
        @media (max-width: 768px) {
          .container { padding: 0 2rem; }
          section { padding: 8rem 1.5rem !important; }
          h1 { font-size: 2.8rem !important; }
          .reveal { transform: translateY(20px); }
        }
      `}} />
    </div>
  )
}
