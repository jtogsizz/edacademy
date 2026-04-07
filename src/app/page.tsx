import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>EdAcademy</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '2rem' }}>
        Plataforma profissional para gestão de aulas particulares e acompanhamento de alunos focada em resultados.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/login" className="btn-primary">
          Fazer Login Direto
        </Link>
        <Link href="/register" className="btn-outline">
          Criar Nova Conta
        </Link>
      </div>
    </div>
  )
}
