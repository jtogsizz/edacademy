"use client"

import { useState } from 'react'
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "Como faço login?",
    answer: "Acesse usando o botão 'Entrar com Google'. Você deve usar o e-mail previamente autorizado pela nossa equipe de suporte."
  },
  {
    question: "Por que não consigo acessar?",
    answer: "O seu e-mail do Google pode não estar na nossa lista de alunos ativos. Se você for um aluno, contate o nosso suporte via WhatsApp para liberar seu acesso."
  },
  {
    question: "Como agendar uma aula?",
    answer: "Na tela de Dashboard, vá na aba 'Agenda', escolha uma data, visualize os horários disponíveis do professor e clique para agendar com os seus créditos ativos."
  },
  {
    question: "Como remarcar?",
    answer: "Você pode cancelar uma aula marcada com até 24h de antecedência para receber um crédito de reposição e agendar um novo horário."
  },
  {
    question: "Quando uso crédito de reposição?",
    answer: "Os créditos de reposição são automáticos. Ao agendar uma aula manual extra fora de sua grade fixa, o sistema usa esses créditos caso você os possua."
  },
  {
    question: "Como entrar na aula?",
    answer: "Quinze minutos antes do início da aula, o link do Google Meet ficará disponível diretamente no seu Dashboard em 'Próximas Aulas'."
  },
  {
    question: "Como falar com suporte?",
    answer: "Utilize o botão de WhatsApp presente na tela de login ou na página principal para falar diretamente conosco."
  }
]

export default function FaqPopout() {
  const [isOpen, setIsOpen] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 999,
          padding: 0
        }}
        aria-label="Abrir Ajuda"
      >
        <HelpCircle size={28} />
      </button>

      {/* Modal/Popout */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '6.5rem',
          right: '2rem',
          width: 'calc(100vw - 4rem)',
          maxWidth: '400px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid var(--border)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--background)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Dúvidas Frequentes</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="btn-ghost"
              style={{ padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Lista de FAQs */}
          <div style={{
            padding: '1rem',
            overflowY: 'auto',
            flex: 1
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: openIndex === index ? 'var(--background)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: 'var(--text)'
                    }}
                  >
                    {faq.question}
                    {openIndex === index ? (
                      <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                  
                  {openIndex === index && (
                    <div style={{
                      padding: '0 1rem 1rem 1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      backgroundColor: 'var(--background)'
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
