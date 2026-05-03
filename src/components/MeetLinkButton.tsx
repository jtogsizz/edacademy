'use client'

import React from 'react'

interface MeetLinkButtonProps {
  url?: string | null
  label: string
  emptyMessage: string
  canEnter: boolean
  isOngoing: boolean
  className?: string
  style?: React.CSSProperties
}

export default function MeetLinkButton({
  url,
  label,
  emptyMessage,
  canEnter,
  isOngoing,
  className,
  style
}: MeetLinkButtonProps) {
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (canEnter && !url) {
      e.preventDefault()
      alert(emptyMessage)
    }
  }

  const finalHref = (canEnter && url) ? url : '#'
  const target = (canEnter && url) ? '_blank' : undefined
  const rel = (canEnter && url) ? 'noopener noreferrer' : undefined

  return (
    <a
      href={finalHref}
      onClick={handleClick}
      target={target}
      rel={rel}
      className={`${className} ${!canEnter ? 'disabled' : ''}`}
      style={{
        ...style,
        opacity: canEnter ? 1 : 0.4,
        cursor: canEnter ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}
    >
      {label}
      {isOngoing && (
        <span style={{ 
          fontSize: '0.65rem', 
          backgroundColor: 'rgba(255,255,255,0.25)', 
          padding: '0.2rem 0.5rem', 
          borderRadius: '99px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          Ao Vivo
        </span>
      )}
    </a>
  )
}
