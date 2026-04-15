"use client"

import { MessageCircle } from 'lucide-react'

// =============== CONFIGURAÇÃO DE SUPORTE ===============
// Para trocar o número de WhatsApp temporariamente ou permanentemente, altere o valor abaixo.
// Formato: DDI + DDD + NÚMERO (sem espaços ou símbolos). Ex: 5511999999999
const WHATSAPP_NUMBER = '5547997710603'
const WHATSAPP_MESSAGE = encodeURIComponent('Olá Melissa! Gostaria de uma ajuda com o acesso à EdAcademy.')
const SUPPORT_NAME = 'Melissa'
// ========================================================

export default function SupportContactCard() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

  return (
    <div className="card" style={{ 
      marginTop: '1.5rem', 
      padding: '1.5rem', 
      textAlign: 'center',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--surface)'
    }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 600 }}>
        Precisa de ajuda?
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
        Para mais informações ou problemas de acesso, entre em contato diretamente com o nosso suporte.
      </p>
      
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary"
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '0.5rem',
          backgroundColor: '#25D366', // WhatsApp Green
          color: '#fff',
          width: '100%'
        }}
      >
        <MessageCircle size={20} />
        Falar com {SUPPORT_NAME}
      </a>
    </div>
  )
}
