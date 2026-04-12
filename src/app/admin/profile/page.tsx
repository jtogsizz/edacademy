import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import SubscriptionManualManager from '@/components/SubscriptionManualManager'
import ToggleSubscriptionButton from '@/components/ToggleSubscriptionButton'
import DeleteUserButton from '@/components/DeleteUserButton'
import Link from 'next/link'
import ProfileEditContainer from '@/components/ProfileEditContainer'
import { updateProfile } from '@/app/dashboard/actions'
import { unstable_noStore as noStore } from 'next/cache'
import { changeUserRole, setTeacherLanguage, setStudentLanguage } from '@/app/admin/actions'

export default async function AdminProfilePage(props: { searchParams?: Promise<any> | any }) {
  noStore()
  // Trata Next14/15 de forma estável (await on non-promise is valid, await on promise resolves it)
  const sp = props.searchParams ? await props.searchParams : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'admin_master') redirect('/dashboard')

  let { data: students } = await supabase
    .from('profiles')
    .select(`
      *,
      subscriptions ( status, plan_type, end_date, notes )
    `)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  let filteredStudents = students || []

  // 1. Filtro Texto (Nome ou E-mail)
  if (sp.q) {
    const qTerm = String(sp.q).toLowerCase()
    filteredStudents = filteredStudents.filter(s => 
      s.full_name?.toLowerCase().includes(qTerm) || 
      s.email?.toLowerCase().includes(qTerm)
    )
  }

  // 2. Filtro Idioma
  if (sp.lang) {
    filteredStudents = filteredStudents.filter(s => s.student_language === sp.lang)
  }

  // 3. Ordenação de Vencimento
  if (sp.sort === 'asc') {
    filteredStudents.sort((a,b) => {
       const subA = Array.isArray(a.subscriptions) ? a.subscriptions[0] : a.subscriptions;
       const subB = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions;
       const tA = subA?.end_date ? new Date(subA.end_date).getTime() : 4102444800000;
       const tB = subB?.end_date ? new Date(subB.end_date).getTime() : 4102444800000;
       return tA - tB;
    })
  } else if (sp.sort === 'desc') {
    filteredStudents.sort((a,b) => {
       const subA = Array.isArray(a.subscriptions) ? a.subscriptions[0] : a.subscriptions;
       const subB = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions;
       const tA = subA?.end_date ? new Date(subA.end_date).getTime() : 0;
       const tB = subB?.end_date ? new Date(subB.end_date).getTime() : 0;
       return tB - tA;
    })
  }

  let admins: any[] = []
  if (profile?.role === 'admin_master') {
    const { data: adminsData } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'admin_master'])
      .neq('id', user.id)
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
        <div style={{ padding: '2rem' }}>
          
          <ProfileEditContainer 
            userId={user.id} 
            initialProfile={{
              full_name: profile?.full_name || '',
              whatsapp_number: profile?.whatsapp_number || '',
              instagram_handle: profile?.instagram_handle || '',
              avatar_url: profile?.avatar_url || null,
              timezone: profile?.timezone || null,
              language: profile?.language || null
            }}
            isReadOnly={false}
            userRole={profile?.role}
            saveAction={updateProfile}
          />

          <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '2rem' }}>
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
                  <th style={{ padding: '1rem' }}>Idioma</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins?.map((admin: any) => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={admin.avatar_url || "/default-avatar.svg"} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {admin.full_name}
                          {admin.role === 'admin_master' && (
                            <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '0.15rem 0.4rem', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: '4px', verticalAlign: 'middle' }}>
                              Master
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <form action={async (fd: FormData) => {
                        'use server'
                        const { setTeacherLanguage } = await import('@/app/admin/actions')
                        await setTeacherLanguage(admin.id, fd.get('language') as string)
                      }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select name="language" defaultValue={admin.language || ''}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                        >
                          <option value="">-- Nenhum --</option>
                          <option value="english">Inglês</option>
                          <option value="spanish">Espanhol</option>
                        </select>
                        <button type="submit" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Salvar</button>
                      </form>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <form action={async () => {
                        'use server'
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
                    <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum professor além do Master. Promova um aluno abaixo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
          <h3 style={{ margin: 0 }}>Gestão de Alunos</h3>
          <form id="filtersForm" method="get" style={{ display: 'none' }}></form>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)' }}>
                <th style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600 }}>Nome</span>
                    <input form="filtersForm" type="text" name="q" placeholder="Pesquisar..." defaultValue={sp.q || ''} style={{ width: '100%', maxWidth: '180px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '0.75rem', fontWeight: 400 }} />
                  </div>
                </th>
                <th style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600 }}>Status</span>
                  </div>
                </th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Vencimento</span>
                    <select form="filtersForm" name="sort" defaultValue={sp.sort || ''} style={{ width: '100%', maxWidth: '140px', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '0.75rem', fontWeight: 400 }}>
                      <option value="">Padrão</option>
                      <option value="asc">A Vencer Primeiro</option>
                      <option value="desc">Mais Distantes</option>
                    </select>
                  </div>
                </th>
                <th style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600 }}>Idioma</span>
                    <select form="filtersForm" name="lang" defaultValue={sp.lang || ''} style={{ width: '100%', maxWidth: '120px', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '0.75rem', fontWeight: 400 }}>
                      <option value="">Todos</option>
                      <option value="english">Inglês</option>
                      <option value="spanish">Espanhol</option>
                    </select>
                  </div>
                </th>
                {profile?.role === 'admin_master' && (
                  <th style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>Cargo</span>
                    </div>
                  </th>
                )}
                <th style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'bottom' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', paddingBottom: '0.1rem' }}>
                    <button form="filtersForm" type="submit" className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Filtrar</button>
                    {(sp.q || sp.lang || sp.sort) && (
                       <Link href="/admin/profile" className="btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Limpar</Link>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student: any) => {
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                          {student.email && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</span>
                          )}
                        </div>
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
                    <td style={{ padding: '1rem' }}>
                      <form action={async (fd: FormData) => {
                        'use server'
                        const { setStudentLanguage } = await import('@/app/admin/actions')
                        await setStudentLanguage(student.id, fd.get('lang') as string)
                      }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select name="lang" defaultValue={student.student_language || ''}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem', maxWidth: '120px' }}
                        >
                          <option value="">--</option>
                          <option value="english">Inglês</option>
                          <option value="spanish">Espanhol</option>
                        </select>
                        <button type="submit" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}>✓</button>
                      </form>
                    </td>
                    {profile?.role === 'admin_master' && (
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <form action={async () => {
                            'use server'
                            await changeUserRole(student.id, 'admin')
                          }}>
                            <button type="submit" className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} title="Tornar um Administrador comum/Professor">
                              Tornar Prof
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <ToggleSubscriptionButton
                        studentId={student.id}
                        currentStatus={sub?.status || 'inactive'}
                        isActive={isActive}
                      />

                      {profile?.role === 'admin_master' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <SubscriptionManualManager 
                            studentId={student.id}
                            studentName={student.full_name}
                            currentStatus={sub?.status || 'inactive'}
                            currentEndDate={sub?.end_date || null}
                            currentNotes={sub?.notes || null}
                          />
                          <DeleteUserButton userId={student.id} userName={student.full_name} />
                        </div>
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
