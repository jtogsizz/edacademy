"use client"

import SupportContactCard from '@/components/SupportContactCard'
import Logo from '@/components/Logo'
import LogoutButton from '@/components/LogoutButton'

export default function InactiveAccountPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Conta Inativa</h2>
        
        <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: '1.5', fontWeight: 500 }}>
          Sua conta ainda está inativa. Para mais informações, entre em contato com a Melissa.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <SupportContactCard />
        </div>

        <div style={{ marginTop: '1rem' }}>
           <LogoutButton />
        </div>
      </div>
    </div>
  )
}
