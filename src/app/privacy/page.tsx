import { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Política de Privacidade | EdAcademy',
  description: 'Saiba como a EdAcademy protege e utiliza seus dados pessoais.',
}

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <header style={{ maxWidth: '800px', margin: '0 auto 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo orientation="horizontal" width={40} />
        </Link>
        <Link href="/" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
          ← Voltar para Home
        </Link>
      </header>

      <main style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: '#fff', 
        padding: '3rem', 
        borderRadius: '24px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid var(--border)' 
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em' }}>
          Política de <span style={{ color: 'var(--primary)' }}>Privacidade</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Última atualização: 24 de abril de 2026</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>1. Introdução</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            A EdAcademy está comprometida com a proteção da sua privacidade. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nossa plataforma de ensino.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>2. Dados que Coletamos</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Para fornecer nossos serviços, coletamos as seguintes informações:
          </p>
          <ul style={{ lineHeight: 1.7, paddingLeft: '1.5rem' }}>
            <li><strong>Informações de Perfil:</strong> Nome completo, e-mail e foto de perfil.</li>
            <li><strong>Informações de Contato:</strong> Número de WhatsApp.</li>
            <li><strong>Preferências:</strong> Fuso horário para agendamento de aulas.</li>
            <li><strong>Autenticação:</strong> Utilizamos o Login do Google para facilitar seu acesso seguro.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>3. Como Utilizamos seus Dados</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul style={{ lineHeight: 1.7, paddingLeft: '1.5rem' }}>
            <li>Realizar seu cadastro e identificação na plataforma.</li>
            <li>Agendar e gerenciar aulas online e eventos.</li>
            <li>Enviar comunicações sobre aulas, avisos e suporte via e-mail ou WhatsApp.</li>
            <li>Melhorar sua experiência de aprendizado na EdAcademy.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>4. Proteção e Compartilhamento</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Implementamos medidas de segurança técnicas para proteger seus dados contra acesso não autorizado. **Nós não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.** Seus dados são armazenados de forma segura em infraestrutura de nuvem certificada.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>5. Seus Direitos</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações do seu perfil ou entrando em contato conosco.
          </p>
        </section>

        <section style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Contato</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-muted)' }}>
            Se tiver dúvidas sobre esta política, entre em contato:
            <br />
            <strong>E-mail:</strong> joaobiel272005@gmail.com
          </p>
        </section>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        &copy; {new Date().getFullYear()} EdAcademy. Todos os direitos reservados.
      </footer>
    </div>
  )
}
