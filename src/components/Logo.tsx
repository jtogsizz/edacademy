import Image from 'next/image'

export default function Logo({ 
  width = 60, 
  hideText = false,
  textColor = 'var(--text-main)',
  color = 'var(--primary)',
  orientation = 'vertical'
}: { 
  width?: number, 
  hideText?: boolean,
  textColor?: string,
  color?: string,
  orientation?: 'horizontal' | 'vertical'
}) {
  const isVertical = orientation === 'vertical'

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isVertical ? 'column' : 'row',
      alignItems: 'center', 
      justifyContent: isVertical ? 'center' : 'flex-start',
      gap: isVertical ? '8px' : '12px', 
      userSelect: 'none',
      textAlign: isVertical ? 'center' : 'left'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease',
      }}>
        <Image 
          src="/images/logo.png" 
          alt="Logo" 
          width={width} 
          height={width}
          style={{ 
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))'
          }}
          priority
        />
      </div>
      {!hideText && (
        <span style={{ 
          fontSize: isVertical ? '1.75rem' : '1.5rem', 
          fontWeight: 800, 
          color: textColor,
          letterSpacing: '-0.04em',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.2
        }}>
          Ed<span style={{ color }}>Academy</span>
        </span>
      )}
    </div>
  )
}
