import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Termos de Serviço | EdAcademy',
  description: 'Leia os termos de uso para utilizar a plataforma EdAcademy.',
}

export default function TermsPage() {
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
          Termos de <span style={{ color: 'var(--primary)' }}>Serviço</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Última atualização: 24 de abril de 2026</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>1. Aceitação dos Termos</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Ao acessar e utilizar a plataforma EdAcademy, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, você não deve utilizar nossos serviços.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>2. Descrição dos Serviços</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            A EdAcademy oferece uma plataforma para o ensino de idiomas, incluindo aulas online individuais ou em grupo, eventos educacionais públicos e internos, gestão de agendamentos, chat interativo e feed de comunidade.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>3. Cadastro e Conta</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Para utilizar a maioria dos recursos, é necessário criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha, e por todas as atividades que ocorram sob sua conta. O acesso é pessoal e intransferível.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>4. Regras de Conduta</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Ao utilizar o Feed ou Chat, você concorda em manter uma conduta respeitosa com professores e outros alunos. É proibido o uso da plataforma para spam, assédio, ou compartilhamento de conteúdo ilegal ou ofensivo.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>5. Pagamentos e Cancelamentos</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            Os planos de assinatura e aulas seguem regras de faturamento recorrente. Cancelamentos de aulas individuais e pedidos de reposição devem ser feitos respeitando os prazos mínimos informados na plataforma para garantir o uso correto dos créditos de reposição.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>6. Limitação de Responsabilidade</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
            A EdAcademy se esforça para manter a plataforma sempre disponível, mas não garante que o serviço será ininterrupto ou livre de erros devido à natureza dos serviços de internet.
          </p>
        </section>

        <section style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Contato</h2>
          <p style={{ lineHeight: 1.7, color: 'var(--text-muted)' }}>
            Dúvidas sobre os termos de uso? Fale conosco:
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
