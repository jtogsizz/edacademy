"use client"

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface MenuProps {
  toggleSlot?: React.ReactNode
  manualSlot?: React.ReactNode
  roleSlot?: React.ReactNode
  deleteSlot?: React.ReactNode
}

export default function StudentManageMenu({ toggleSlot, manualSlot, roleSlot, deleteSlot }: MenuProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        
        // Se houver menos de 260px embaixo e mais espaço em cima, abre pra cima
        const openUpwards = spaceBelow < 260 && spaceAbove > spaceBelow

        let rightPos: string | number = window.innerWidth - rect.right
        let leftPos: string | number = 'auto'

        // Proteção mobile: se alinhar à direita for vazar pra esquerda da tela
        if (rect.right < 190) {
          rightPos = 'auto'
          leftPos = rect.left
        }

        setMenuStyle({
          position: 'fixed',
          top: openUpwards ? 'auto' : rect.bottom + 6,
          bottom: openUpwards ? window.innerHeight - rect.top + 6 : 'auto',
          right: rightPos,
          left: leftPos,
          zIndex: 9999,
        })
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, { capture: true })
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, { capture: true })
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.42rem 0.85rem', fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--text-main)', backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
          boxShadow: open ? '0 0 0 2px var(--ring)' : 'none',
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Gerenciar
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
          style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            ...menuStyle,
            minWidth: '180px', backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden', animation: 'mgDropIn 0.14s ease-out',
          }}
        >
          {manualSlot && (
            <div className="mg-item" role="menuitem">
              {manualSlot}
            </div>
          )}
          {toggleSlot && (
            <div
              className="mg-item"
              style={{ borderTop: manualSlot ? '1px solid var(--border)' : undefined }}
              role="menuitem"
            >
              {toggleSlot}
            </div>
          )}
          {roleSlot && (
            <div className="mg-item" style={{ borderTop: (manualSlot || toggleSlot) ? '1px solid var(--border)' : undefined }}
              role="menuitem">
              {roleSlot}
            </div>
          )}
          {deleteSlot && (
            <div className="mg-item mg-item-danger" style={{ borderTop: (manualSlot || toggleSlot || roleSlot) ? '1px solid var(--border)' : undefined }}
              role="menuitem">
              {deleteSlot}
            </div>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes mgDropIn {
          from { opacity: 0; transform: translateY(-5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        /* Wrapper de cada item */
        .mg-item { padding: 0.2rem 0.5rem; }
        /* Todos os botões/forms dentro do dropdown — centralizados */
        .mg-item button,
        .mg-item form button,
        .mg-item > div > button {
          width: 100% !important;
          text-align: center !important;
          justify-content: center !important;
          padding: 0.55rem 0.75rem !important;
          border-radius: 6px !important;
          font-size: 0.83rem !important;
          font-weight: 500 !important;
          background: none !important;
          border: none !important;
          cursor: pointer;
          color: var(--text-main) !important;
          transition: background 0.12s !important;
          display: flex !important;
          align-items: center !important;
        }
        .mg-item button:hover,
        .mg-item form button:hover { background: var(--bg-hover) !important; }
        .mg-item-danger button,
        .mg-item-danger form button { color: #dc2626 !important; }
        .mg-item-danger button:hover,
        .mg-item-danger form button:hover { background: rgba(239,68,68,0.07) !important; }
        /* Garante que os wrappers dos client components também ficam full-width */
        .mg-item > div { width: 100%; }
      `}</style>
    </>
  )
}
