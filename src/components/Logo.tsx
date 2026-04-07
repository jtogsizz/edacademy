import React from 'react'

export default function Logo({ width = 160, color = 'var(--primary)', textColor = 'var(--text-main)', hideText = false }: { width?: number, color?: string, textColor?: string, hideText?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
      <svg 
        width={hideText ? width : width * 0.25} 
        height={hideText ? width : width * 0.25} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="100" height="100" rx="24" fill={color} />
        <path d="M50 25L25 40L50 55L75 40L50 25Z" fill="white" />
        <path d="M25 55L50 70L75 55M25 65L50 80L75 65" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 55V70" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!hideText && (
        <span style={{ 
          fontSize: `${width * 0.15}px`, 
          fontWeight: 800, 
          color: textColor,
          letterSpacing: '-0.03em',
          fontFamily: 'Inter, sans-serif'
        }}>
          Ed<span style={{ color }}>Academy</span>
        </span>
      )}
    </div>
  )
}
