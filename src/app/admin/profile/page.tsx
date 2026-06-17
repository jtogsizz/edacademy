import { createClient, createAdminClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import SubscriptionManualManager from '@/components/SubscriptionManualManager'
import ToggleSubscriptionButton from '@/components/ToggleSubscriptionButton'
import DeleteUserButton from '@/components/DeleteUserButton'
import Link from 'next/link'
import ProfileEditContainer from '@/components/ProfileEditContainer'
import PixConfigSection from './PixConfigSection'
import StudentManageMenu from './StudentManageMenu'
import PreferencesToggle from '@/components/PreferencesToggle'
import { updateProfile } from '@/app/dashboard/actions'
import { unstable_noStore as noStore } from 'next/cache'
import { changeUserRole, setTeacherLanguage, setStudentLanguage, updatePixConfig } from '@/app/admin/actions'
import { isMasterRole, isAdminRole, isDevRole, allowedTargetRoles, ROLE_LABELS, ROLE_BADGE_STYLE, AppRole } from '@/utils/roles'
import NotificationBell from '@/components/NotificationBell'

// Gera avatar com iniciais + cor derivada do nome
function AvatarInitials({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16']
  const bg = palette[name.charCodeAt(0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: bg,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, letterSpacing: '0.03em',
    }}>
      {initials}
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminProfilePage(props: { searchParams?: Promise<any> | any }) {
  noStore()
  const sp = props.searchParams ? await props.searchParams : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!isAdminRole(profile?.role)) redirect('/dashboard')

  let { data: students } = await supabase
    .from('profiles')
    .select(`*, subscriptions ( status, plan_type, end_date, notes )`)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  // Buscar emails de auth.users via service role (profiles não tem coluna email)
  // Necessário para exibir emails de contas ativas E inativas na gestão de alunos
  try {
    const adminClient = await createAdminClient()
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (authUsers?.users && students) {
      const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))
      students = students.map(s => ({ ...s, email: emailMap.get(s.id) ?? s.email ?? null }))
    }
  } catch (err) {
    console.error('[AdminProfile] Erro ao buscar emails via admin client:', err)
    // Falha silenciosa — emails ficam null mas o restante da página funciona
  }

  let filteredStudents = students || []

  if (sp.q) {
    const q = String(sp.q).toLowerCase()
    filteredStudents = filteredStudents.filter(s =>
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.id?.toLowerCase() === q  // fallback: busca exata por UUID
    )
  }
  // 2. Filtro Status
  if (sp.status === 'active') {
    filteredStudents = filteredStudents.filter(s => {
      const sub = Array.isArray(s.subscriptions) ? s.subscriptions[0] : s.subscriptions
      return sub?.status === 'active'
    })
  } else if (sp.status === 'inactive') {
    filteredStudents = filteredStudents.filter(s => {
      const sub = Array.isArray(s.subscriptions) ? s.subscriptions[0] : s.subscriptions
      return sub?.status !== 'active'
    })
  }
  // 3. Filtro Idioma
  if (sp.lang) filteredStudents = filteredStudents.filter(s => s.student_language === sp.lang)
  // 4. Ordenação Vencimento
  if (sp.sort === 'asc') {
    filteredStudents.sort((a, b) => {
      const sa = Array.isArray(a.subscriptions) ? a.subscriptions[0] : a.subscriptions
      const sb = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions
      return (sa?.end_date ? new Date(sa.end_date).getTime() : 4102444800000)
           - (sb?.end_date ? new Date(sb.end_date).getTime() : 4102444800000)
    })
  } else if (sp.sort === 'desc') {
    filteredStudents.sort((a, b) => {
      const sa = Array.isArray(a.subscriptions) ? a.subscriptions[0] : a.subscriptions
      const sb = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions
      return (sb?.end_date ? new Date(sb.end_date).getTime() : 0)
           - (sa?.end_date ? new Date(sa.end_date).getTime() : 0)
    })
  }

  // Professores (admin + admin_master) — visíveis para master e dev
  let admins: any[] = []
  if (isMasterRole(profile?.role)) {
    const { data } = await supabase.from('profiles').select('*')
      .in('role', ['admin', 'admin_master']).neq('id', user.id).order('created_at', { ascending: false })
    admins = data || []
  }

  // Equipe interna (suporte + dev) — visível apenas para dev
  let team: any[] = []
  if (isDevRole(profile?.role)) {
    const { data } = await supabase.from('profiles').select('*')
      .in('role', ['suporte', 'dev']).neq('id', user.id).order('created_at', { ascending: false })
    team = data || []
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('pix_key, pix_key_type, pix_beneficiary_name, pix_qr_code_url')
    .maybeSingle()

  const isMaster = isMasterRole(profile?.role)
  const isDev = isDevRole(profile?.role)
  const executorRole = profile?.role as AppRole
  const targetRoles = allowedTargetRoles(executorRole) // roles que este executor pode promover
  const hasFilters = !!(sp.q || sp.lang || sp.sort || sp.status)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '8rem', maxWidth: '1280px' }}>

      {/* ── HEADER ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, lineHeight: 1.15 }}>Painel Admin</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Gerencie alunos, professores e configurações da plataforma
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <LogoutButton />
        </div>
      </header>

      {/* ── PERFIL DO ADMIN ── */}
      <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <SectionHeader label="Configurações e Perfil" />
        <div style={{ padding: '2rem' }}>
          <ProfileEditContainer
            userId={user.id}
            initialProfile={{
              full_name: profile?.full_name || '',
              whatsapp_number: profile?.whatsapp_number || '',
              instagram_handle: profile?.instagram_handle || '',
              avatar_url: profile?.avatar_url || null,
              timezone: profile?.timezone || null,
              language: profile?.language || null,
              meet_url: profile?.meet_url || null,
            }}
            isReadOnly={false}
            userRole={profile?.role}
            saveAction={updateProfile}
          />
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isMaster && (
              <Link href="/admin/master-agenda" className="btn-primary"
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}>
                Acessar Planilha de Aulas
              </Link>
            )}
            {!['suporte', 'dev'].includes(executorRole) && (
              <Link href="/admin/schedule" className="btn-outline"
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}>
                {isMaster ? 'Gerenciar Minhas Aulas Pessoais' : 'Gerenciar Horários da Agenda'}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── PREFERÊNCIAS — Tema e Idioma ── */}
      <section style={{ marginBottom: '2rem' }}>
        <PreferencesToggle />
      </section>

      {/* ── GESTÃO DE PROFESSORES (admin_master + dev) ── */}
      {isMaster && (
        <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--primary-light)' }}>
          <SectionHeader label="Gestão de Professores" sub="Professores e administradores ativos na plataforma" accent />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
                  {['Professor', 'Idioma', 'Ações'].map((h, i) => (
                    <th key={h} style={{ padding: '0.85rem 1.5rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin: any) => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--primary-light)' }}>
                          <img src={admin.avatar_url || '/default-avatar.svg'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {admin.full_name}
                            {admin.role === 'admin_master' && (
                              <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>MASTER</span>
                            )}
                          </div>
                          {admin.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{admin.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <form action={async (fd: FormData) => {
                        'use server'
                        const { setTeacherLanguage } = await import('@/app/admin/actions')
                        await setTeacherLanguage(admin.id, fd.get('language') as string)
                      }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select name="language" defaultValue={admin.language || ''}
                          style={{ padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem', width: 'auto' }}>
                          <option value="">-- Nenhum --</option>
                          <option value="english">Inglês</option>
                          <option value="spanish">Espanhol</option>
                        </select>
                        <button type="submit" className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}>Salvar</button>
                      </form>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <StudentManageMenu
                        roleSlot={targetRoles.filter(r => r !== admin.role).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {targetRoles.filter(r => r !== admin.role).map(role => (
                              <form key={role} action={async () => {
                                'use server'
                                await changeUserRole(admin.id, role)
                              }}>
                                <button type="submit">Tornar {ROLE_LABELS[role] || role}</button>
                              </form>
                            ))}
                          </div>
                        ) : undefined}
                        deleteSlot={isMaster ? (
                          <DeleteUserButton userId={admin.id} userName={admin.full_name} />
                        ) : undefined}
                      />
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum professor além do Master. Promova um aluno abaixo.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── EQUIPE INTERNA (suporte + dev) — visível apenas para dev ── */}
      {isDev && (
        <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem', border: '1px solid rgba(168,85,247,0.25)' }}>
          <SectionHeader label="Equipe Interna" sub="Usuários com roles especiais (Suporte e Dev)" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
                  {['Membro', 'Função', 'Ações'].map((h, i) => (
                    <th key={h} style={{ padding: '0.85rem 1.5rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.map((member: any) => {
                  const roleKey = member.role as AppRole
                  const badge = ROLE_BADGE_STYLE[roleKey] || ROLE_BADGE_STYLE.student
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <AvatarInitials name={member.full_name || 'U'} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{member.full_name}</div>
                            {member.email && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{member.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {ROLE_LABELS[roleKey] || roleKey}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <StudentManageMenu
                          roleSlot={targetRoles.filter(r => r !== member.role).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {targetRoles.filter(r => r !== member.role).map(role => (
                                <form key={role} action={async () => {
                                  'use server'
                                  await changeUserRole(member.id, role)
                                }}>
                                  <button type="submit">Tornar {ROLE_LABELS[role] || role}</button>
                                </form>
                              ))}
                            </div>
                          ) : undefined}
                          deleteSlot={isMaster ? (
                            <DeleteUserButton userId={member.id} userName={member.full_name} />
                          ) : undefined}
                        />
                      </td>
                    </tr>
                  )
                })}
                {team.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum membro de equipe interna além de você.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── PIX CONFIG ── */}
      {isMaster && (
        <PixConfigSection
          initial={{ pix_key: settings?.pix_key || null, pix_key_type: settings?.pix_key_type || null, pix_beneficiary_name: settings?.pix_beneficiary_name || null, pix_qr_code_url: settings?.pix_qr_code_url || null }}
          saveAction={updatePixConfig}
        />
      )}

      {/* ── GESTÃO DE ALUNOS ── */}
      <section style={{ marginTop: '2.5rem' }}>

        {/* Cabeçalho da seção */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>Gestão de Alunos</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '0.25rem' }}>
              Gerencie acessos, planos e configurações dos alunos
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{filteredStudents.length}</strong>
            {' '}aluno{filteredStudents.length !== 1 ? 's' : ''}{hasFilters ? ' encontrado' + (filteredStudents.length !== 1 ? 's' : '') : ''}
          </span>
        </div>

        {/* Barra de Filtros */}
        <div className="card" style={{ padding: '1.1rem 1.4rem', marginBottom: '1.1rem', borderRadius: 'var(--radius-md)' }}>
          <form id="filtersForm" method="get" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'flex-end' }}>
            <FilterField label="Buscar">
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" name="q" placeholder="Nome ou e-mail…" defaultValue={sp.q || ''}
                  style={{ paddingLeft: '2.1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', paddingRight: '0.75rem', fontSize: '0.855rem', borderRadius: 'var(--radius-sm)', width: '100%' }} />
              </div>
            </FilterField>

            <FilterField label="Status" width="120px">
              <select name="status" defaultValue={sp.status || ''}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.855rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
                <option value="">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Bloqueado</option>
              </select>
            </FilterField>

            <FilterField label="Vencimento" width="155px">
              <select name="sort" defaultValue={sp.sort || ''}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.855rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
                <option value="">Padrão</option>
                <option value="asc">A Vencer Primeiro</option>
                <option value="desc">Mais Distantes</option>
              </select>
            </FilterField>

            <FilterField label="Idioma" width="120px">
              <select name="lang" defaultValue={sp.lang || ''}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.855rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
                <option value="">Todos</option>
                <option value="english">Inglês</option>
                <option value="spanish">Espanhol</option>
              </select>
            </FilterField>

            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-end', flexShrink: 0 }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.855rem', whiteSpace: 'nowrap' }}>
                Filtrar
              </button>
              {hasFilters && (
                <Link href="/admin/profile" className="btn-outline" style={{ padding: '0.5rem 0.85rem', fontSize: '0.855rem', whiteSpace: 'nowrap' }}>
                  Limpar
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Alunos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {filteredStudents.length === 0 && (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>🔍</div>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Nenhum aluno encontrado</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                {hasFilters ? 'Tente remover ou ajustar os filtros.' : 'Nenhum aluno cadastrado ainda.'}
              </div>
            </div>
          )}

          {filteredStudents.map((student: any) => {
            const subArr = Array.isArray(student.subscriptions) ? student.subscriptions : [student.subscriptions]
            const sub = subArr[0]
            const isActive = sub?.status === 'active'
            const endDate = sub?.end_date ? new Date(sub.end_date) : null

            // Status visual
            let statusLabel = isActive ? 'Ativo' : 'Inativo'
            let statusBg = isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)'
            let statusColor = isActive ? '#059669' : '#6B7280'
            let statusBorder = isActive ? 'rgba(16,185,129,0.25)' : 'rgba(107,114,128,0.2)'
            let statusDot = statusColor

            if (isActive && endDate) {
              const diff = Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
              if (diff < 0) {
                statusLabel = 'Vencido'
                statusBg = 'rgba(239,68,68,0.1)'; statusColor = '#DC2626'; statusBorder = 'rgba(239,68,68,0.25)'; statusDot = '#DC2626'
              } else if (diff <= 3) {
                statusLabel = `Vence em ${diff}d`
                statusBg = 'rgba(245,158,11,0.1)'; statusColor = '#D97706'; statusBorder = 'rgba(245,158,11,0.3)'; statusDot = '#D97706'
              }
            }

            const langLabel: Record<string, string> = { english: 'Inglês', spanish: 'Espanhol', portuguese: 'Português', french: 'Francês', german: 'Alemão' }

            return (
              <div key={student.id} className="student-card card" style={{
                padding: '0.9rem 1.4rem', borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto',
                alignItems: 'center', gap: '1.25rem',
              }}>

                {/* Identidade */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
                  <AvatarInitials name={student.full_name || 'U'} size={38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{student.full_name}</span>
                      {student.whatsapp_number && (
                        <a href={`https://wa.me/${student.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                          title="WhatsApp" style={{ color: '#25D366', display: 'inline-flex', opacity: 0.75 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12 19.79 19.79 0 0 1 1.12 3.38 2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.05rem' }}>
                      {student.email || '—'}
                    </div>
                    {sub?.notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                        {sub.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.28rem 0.65rem', borderRadius: '9999px',
                    fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.03em',
                    backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusBorder}`,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                    {statusLabel}
                  </span>
                </div>

                {/* Vencimento */}
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 72 }}>
                  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>Vence</div>
                  <div style={{ fontSize: '0.855rem', fontWeight: 600 }}>
                    {endDate ? endDate.toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>

                {/* Idioma select */}
                <div style={{ flexShrink: 0 }}>
                  <form action={async (fd: FormData) => {
                    'use server'
                    const { setStudentLanguage } = await import('@/app/admin/actions')
                    await setStudentLanguage(student.id, fd.get('lang') as string)
                  }} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <select name="lang" defaultValue={student.student_language || ''}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.8rem', width: 'auto', minWidth: 96 }}>
                      <option value="">Idioma</option>
                      <option value="english">Inglês</option>
                      <option value="spanish">Espanhol</option>
                    </select>
                    <button type="submit" title="Salvar idioma" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)',
                      cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                  </form>
                </div>

                {/* ── Dropdown Gerenciar ── */}
                <div style={{ flexShrink: 0 }}>
                  <StudentManageMenu
                    toggleSlot={
                      <ToggleSubscriptionButton
                        studentId={student.id}
                        currentStatus={sub?.status || 'inactive'}
                        isActive={isActive}
                      />
                    }
                    manualSlot={isMaster ? (
                      <SubscriptionManualManager
                        studentId={student.id}
                        studentName={student.full_name}
                        currentStatus={sub?.status || 'inactive'}
                        currentEndDate={sub?.end_date || null}
                        currentNotes={sub?.notes || null}
                      />
                    ) : undefined}
                    roleSlot={targetRoles.filter(r => r !== student.role).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {targetRoles.filter(r => r !== student.role).map(role => (
                          <form key={role} action={async () => {
                            'use server'
                            await changeUserRole(student.id, role)
                          }}>
                            <button type="submit">Tornar {ROLE_LABELS[role] || role}</button>
                          </form>
                        ))}
                      </div>
                    ) : undefined}
                    deleteSlot={isMaster ? (
                      <DeleteUserButton userId={student.id} userName={student.full_name} />
                    ) : undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .student-card { transition: box-shadow 0.15s; }
        .student-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        @media (max-width: 860px) {
          .student-card { grid-template-columns: 1fr auto auto !important; }
        }
        @media (max-width: 600px) {
          .student-card { grid-template-columns: 1fr !important; }
          .container { padding: 1rem !important; }
        }
        /* Fix selects de idioma */
        .student-card select { width: auto !important; }
      `}} />
    </div>
  )
}

// ── Helper Components ──────────────────────────────────────────────────────────

function SectionHeader({ label, sub, accent }: { label: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      padding: '1.1rem 1.6rem',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '0.65rem',
      backgroundColor: accent ? 'rgba(234,88,12,0.02)' : undefined,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--primary)', flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  )
}

function FilterField({ label, children, width }: { label: string; children: React.ReactNode; width?: string }) {
  return (
    <div style={{ flex: width ? `0 0 ${width}` : '2 1 180px', minWidth: width || '140px' }}>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
