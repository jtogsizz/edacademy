"use client"

import { useState, useRef, useEffect } from 'react'
import { updatePost, deletePost } from '../app/dashboard/actions'

interface PostAuthorMenuProps {
  postId: string
  initialContent: string
  isAuthor: boolean
  hideContentRender?: boolean
}

export default function PostAuthorMenu({ postId, initialContent, isAuthor, hideContentRender = false }: PostAuthorMenuProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(initialContent)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sincronizar o estado interno caso a prop mude (após revalidatePath no servidor)
  useEffect(() => {
    setEditContent(initialContent)
  }, [initialContent])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleEditConfirm = async () => {
    if (!editContent.trim() || editContent === initialContent) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    const res = await updatePost(postId, editContent)
    setIsLoading(false)

    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditing(false)
    }
  }

  const handleDeleteClick = async () => {
    setIsMenuOpen(false)
    if (confirm('Tem certeza que deseja excluir esta publicação da dashboard?')) {
      setIsLoading(true)
      const res = await deletePost(postId)
      setIsLoading(false)
      if (res?.error) {
        alert(res.error)
      }
    }
  }

  return (
    <>
      {isAuthor && (
        <div ref={menuRef} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', 
              padding: '0.25rem 0.5rem', borderRadius: '4px',
              color: 'var(--text-muted)'
            }}
            title="Opções do Post"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {isMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: '0', 
              backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: '120px', overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}>
              <button 
                onClick={() => { setIsMenuOpen(false); setIsEditing(true); }}
                style={{
                  padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem',
                  color: 'var(--text-main)', borderBottom: '1px solid var(--border)'
                }}
              >
                Editar
              </button>
              <button 
                onClick={handleDeleteClick}
                style={{
                  padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                  textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem',
                  color: 'var(--error)'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Aguarde...' : 'Excluir'}
              </button>
            </div>
          )}
        </div>
      )}

      {isEditing ? (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '8px',
              border: '1px solid var(--primary-light)', background: 'var(--bg-main)', 
              color: 'var(--text-main)', fontSize: '1rem', resize: 'vertical', minHeight: '100px'
            }}
            disabled={isLoading}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => { setIsEditing(false); setEditContent(initialContent); }}
              className="btn-outline" 
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              onClick={handleEditConfirm}
              className="btn-primary" 
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : !hideContentRender ? (
        <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)', fontSize: '1rem' }}>
          {initialContent}
        </p>
      ) : null}
    </>
  )
}
