import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import { toggleSubscriptionStatus } from '@/app/admin/actions'
import SubscriptionManualManager from '@/components/SubscriptionManualManager'
import Link from 'next/link'
import ProfileAvatarUpload from '@/components/ProfileAvatarUpload'
import ProfileEditForm from '@/components/ProfileEditForm'
import { updateProfile } from '@/app/dashboard/actions'


export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') redirect('/dashboard')

  const { data: students } = await supabase
    .from('profiles')
    .select(`
      *,
      subscriptions ( status, plan_type, end_date, notes )
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  let admins: any[] = []
  if (profile?.role === 'admin_master') {
    const { data: adminsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
    admins = adminsData || []
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Perfil do Admin</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie alunos e sistema.</p>
        </div>
        <LogoutButton />
      </header>
      
      {/* área do adm arrumar a própria lata */}
      <section className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <h3>Configurações e Perfil</h3>
        </div>
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Avatar Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
             <ProfileAvatarUpload currentAvatarUrl={profile?.avatar_url} userId={user.id} size="120px" />
             <div style={{ textAlign: 'center' }}>
               <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{profile?.full_name}</h4>
               <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', borderRadius: '12px', fontWeight: 600 }}>
                 {profile?.role === 'admin_master' ? 'Admin Master' : 'Professor'}
               </span>
             </div>
          </div>

          <ProfileEditForm 
            initialFullName={profile?.full_name || ''} 
            initialWhatsapp={profile?.whatsapp_number || ''} 
            initialInstagram={profile?.instagram_handle || ''}
            saveAction={updateProfile}
          />


          <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <Link href="/admin/schedule" className="btn-outline" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
              {profile?.role === 'admin_master' ? 'Gerenciar Minhas Aulas' : 'Gerenciar Horários da Agenda'}
            </Link>
          </div>
        </div>
      </section>

      {/* área do adm_master gerenciar outros professores */}
      {profile?.role === 'admin_master' && (
        <section className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--primary-light)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <h3>Gestão de Professores</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Abaixo estão os professores/admins atuais na plataforma.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)' }}>
                  <th style={{ padding: '1rem' }}>Professor</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins?.map((admin: any) => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', overflow: 'hidden' }}>
                          <img src={admin.avatar_url || "/default-avatar.svg"} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{admin.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <form action={async () => {
                        'use server'
                        const { changeUserRole } = await import('@/app/admin/actions')
                        await changeUserRole(admin.id, 'student')
                      }}>
                        <button type="submit" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--error)', borderColor: 'var(--error)' }}>
                          Rebaixar para Aluno
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum professor além do Master. Promova um aluno abaixo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <h3>Gestão de Alunos</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)' }}>
                <th style={{ padding: '1rem' }}>Nome</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Vencimento</th>
                {profile?.role === 'admin_master' && <th style={{ padding: '1rem', textAlign: 'center' }}>Cargo</th>}
                <th style={{ padding: '1rem', textAlign: 'right' }}>Ação (Acesso)</th>
              </tr>
            </thead>
            <tbody>
              {students?.map(student => {
                const subArray = Array.isArray(student.subscriptions) ? student.subscriptions : [student.subscriptions]
                const sub = subArray[0]
                const isActive = sub?.status === 'active'
                const endDate = sub?.end_date ? new Date(sub.end_date) : null
                const today = new Date(); today.setHours(0,0,0,0);

                // Lógica de Alertas Visuais Profissionais
                let statusText = isActive ? 'Ativo' : 'Inativo'
                let statusClass = isActive ? 'badge-active' : 'badge-inactive'
                
                if (isActive && endDate) {
                   const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
                   if (diffDays < 0) {
                      statusText = 'Assinatura Vencida'
                      statusClass = 'badge-error' // Utiliza a classe de erro para destaque sóbrio
                   } else if (diffDays <= 3) {
                      statusText = `Vence em ${diffDays} dias`
                      statusClass = 'badge-warning' // Alerta moderado
                   }
                }

                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                        {student.whatsapp_number && (
                           <a 
                             href={`https://wa.me/${student.whatsapp_number.replace(/\D/g, '')}`} 
                             target="_blank" rel="noopener noreferrer"
                             title="WhatsApp"
                             style={{ display: 'inline-flex', opacity: 0.5, color: 'inherit' }}
                           >
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                           </a>
                        )}
                      </div>
                      {sub?.notes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Nota: {sub.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${statusClass}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                        {statusText}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {sub?.end_date ? new Date(sub.end_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    {profile?.role === 'admin_master' && (
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <form action={async () => {
                          'use server'
                          const { changeUserRole } = await import('@/app/admin/actions')
                          await changeUserRole(student.id, 'admin')
                        }}>
                          <button type="submit" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                            Tornar Prof/Admin
                          </button>
                        </form>
                      </td>
                    )}
                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <form action={async () => {
                        'use server'
                        const { toggleSubscriptionStatus } = await import('@/app/admin/actions')
                        await toggleSubscriptionStatus(student.id, sub?.status || 'inactive')
                      }}>
                        <button type="submit" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: isActive ? 'var(--error)' : 'var(--success)', borderColor: isActive ? 'var(--error)' : 'var(--success)' }}>
                          {isActive ? 'Bloquear Acesso' : 'Liberar Acesso'}
                        </button>
                      </form>

                      {profile?.role === 'admin_master' && (
                        <SubscriptionManualManager 
                          studentId={student.id}
                          studentName={student.full_name}
                          currentStatus={sub?.status || 'inactive'}
                          currentEndDate={sub?.end_date || null}
                          currentNotes={sub?.notes || null}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan={profile?.role === 'admin_master' ? 5 : 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum aluno encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 600px) {
          section[style*="grid-template-columns: minmax"] { grid-template-columns: 1fr !important; }
          .card[style*="justify-content: space-between"] { flex-direction: column; align-items: flex-start !important; }
          .save-button-container { width: 100%; }
          .save-button-container button { width: 100%; justify-content: center; }
        }
      `}} />
    </div>
  )
}

