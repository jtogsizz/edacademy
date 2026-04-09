import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'
import ProfessorCarousel, { Professor } from '@/components/ProfessorCarousel'
import fs from 'fs'
import path from 'path'

export default function Home() {
  // Configuração dos professores com versionamento automático via mtime (timestamp do arquivo)
  const professorsData = [
    { name: 'Ed', role: 'Prof. Inglês', filename: 'professor1.png' },
    { name: 'João', role: 'Desenvolvedor', filename: 'professor2.png' },
    { name: 'Melissa', role: 'Assistente', filename: 'professor3.png' },
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

  return (

    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* --- HERO SECTION --- */}
      <section style={{
        padding: '6rem 1.5rem 4rem',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #FFFFFF 0%, var(--bg-main) 100%)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
            <Logo width={80} />
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            fontWeight: 800,
            marginBottom: '1.5rem',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(90deg, var(--text-main) 0%, #4B5563 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Evolução real no seu <span style={{ color: 'var(--primary)', WebkitTextFillColor: 'initial' }}>ritmo</span>
          </h1>

          <p style={{
            fontSize: '1.25rem',
            color: 'var(--text-muted)',
            marginBottom: '3rem',
            lineHeight: 1.6,
            maxWidth: '600px',
            marginInline: 'auto'
          }}>
            A EdAcademy une o acompanhamento individualizado à tecnologia para garantir que você atinja seus objetivos com aulas organizadas e eficazes.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/login" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
              Acessar Minha Conta
            </Link>
            <Link href="/register" className="btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
              Começar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* --- PROFESSOR SECTION --- */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FFFFFF' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div className="card professor-card" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(Min(100%, 400px), 1fr))',
            gap: '3rem',
            alignItems: 'center',
            backgroundColor: 'var(--bg-main)',
            border: 'none',
            boxShadow: '0 20px 40px -20px rgba(0,0,0,0.1)'
          }}>

            {/* Carrossel de Professores */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 auto' }}>
              <ProfessorCarousel professors={professors} />
            </div>

            {/* Texto de Apresentação */}
            <div style={{ textAlign: 'left' }} className="mobile-center">
              <span style={{
                color: 'var(--primary)',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
                display: 'block'
              }}>
                Acompanhamento Individualizado
              </span>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                Foco total na sua <span style={{ color: 'var(--primary)' }}>jornada</span> de aprendizado.
              </h2>

              <div style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '1.2rem' }}>
                  Acreditamos que aprender um novo idioma não precisa ser um processo rígido ou monótono. Nossa metodologia foca no que realmente importa, <strong>a sua evolução prática e a confiança para se comunicar.</strong>
                </p>
                <p style={{ marginBottom: '1.2rem' }}>
                  Através da EdAcademy, oferecemos um suporte completo e flexível. Cada aula é planejada respeitando o seu ritmo, garantindo que seu progresso seja constante e focado nos seus objetivos reais.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '2rem' }}>
                  {[
                    "Metodologia prática e direta",
                    "Acompanhamento individual próximo",
                    "Agenda flexível integrada",
                    "Material de apoio personalizado"
                  ].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.8rem', fontWeight: 500, color: 'var(--text-main)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Galeria de Fotos Secundária */}
          <div style={{
            marginTop: '3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ height: '240px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
              <Image src="/images/professor/foto2.jpg" alt="Ambiente de aulas" fill sizes="(max-width: 1000px) 100vw, 300px" style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ height: '240px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
              <Image src="/images/professor/foto3.jpg" alt="Processo de ensino" fill sizes="(max-width: 1000px) 100vw, 300px" style={{ objectFit: 'cover' }} />
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', backgroundColor: 'var(--primary-light)', border: '1px dashed var(--primary)', padding: '2rem' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 700 }}>Vamos começar?</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Sua primeira aula está a um clique de distância.</p>
              <Link href="/register" style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'underline' }}>
                Quero me matricular
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* --- ESTILOS ADICIONAIS --- */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .professor-card {
          padding: 4rem;
        }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .container { padding: 0 1.25rem; }
          section { padding: 3.5rem 1rem !important; }
          .professor-card { padding: 2.5rem 1.5rem !important; gap: 2rem !important; }
          .mobile-center { text-align: center !important; }
          .mobile-center ul { display: inline-block; text-align: left; }
          h1 { font-size: 2.5rem !important; }
        }
      `}} />
    </div>
  )
}
