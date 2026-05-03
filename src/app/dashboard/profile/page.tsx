import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import ProfileEditContainer from '@/components/ProfileEditContainer'
import RecurringClassForm from './RecurringClassForm'
import RemoveClassButton from './RemoveClassButton'
import PixPaymentModal from '@/components/PixPaymentModal'
import { updateProfile } from '@/app/dashboard/actions'
import { unstable_noStore as noStore } from 'next/cache'
import { cookies } from 'next/headers'

export default async function StudentProfilePage() {
  // Garante que essa página sempre busca dados frescos do banco, nunca do cache
  noStore()
  const supabase = await createClient()

  const cookieStore = await cookies()
  const clientTz = cookieStore.get('client_tz')?.value

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'admin_master') {
    redirect('/admin')
  }

  const userTz = profile?.timezone || clientTz || 'America/Sao_Paulo'
  const isFallback = !profile?.timezone && !clientTz

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('student_id', user.id)
    .single()

  const isActive = subscription?.status === 'active'

  // Calcula alertas de vencimento
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let daysUntilExpiry: number | null = null
  if (subscription?.end_date) {
    const expiry = new Date(subscription.end_date)
    expiry.setHours(0, 0, 0, 0)
    daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
  const isUrgent = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 3
  const isWarning = daysUntilExpiry !== null && daysUntilExpiry > 3 && daysUntilExpiry <= 7

  // 1. Buscar Professores Disponíveis — filtrar pelo idioma do aluno
  let teachersQuery = supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'admin_master'])
    .order('full_name')

  if (profile?.student_language) {
    teachersQuery = teachersQuery.eq('language', profile.student_language)
  }

  const { data: teachers } = await teachersQuery

  // 3. Buscar Agendamentos (apenas para exibir créditos e horários fixos)
  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*, teacher:profiles!recurring_classes_teacher_id_fkey(id, full_name)')
    .eq('student_id', user.id)

  // Buscar config PIX (para exibir botão de pagamento)
  const { data: pixSettings } = await supabase
    .from('settings')
    .select('pix_key, pix_key_type, pix_beneficiary_name, pix_qr_code_url')
    .maybeSingle()

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', paddingBottom: '6rem', maxWidth: '1000px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Meu Perfil</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie suas aulas e agenda semanal.</p>
        </div>
        <LogoutButton />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(Min(100%, 350px), 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* Info Card com Upload de Avatar e Form de Edição */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <ProfileEditContainer 
            userId={user.id} 
            initialProfile={{
              full_name: profile?.full_name || '',
              whatsapp_number: profile?.whatsapp_number || '',
              instagram_handle: profile?.instagram_handle || '',
              avatar_url: profile?.avatar_url || null,
              timezone: profile?.timezone || null,
              meet_url: profile?.meet_url || null
            }}
            isReadOnly={false}
            userRole={profile?.role}
            saveAction={updateProfile}
          />
        </section>

        {/* Status Info — Plano e Idioma */}
        <section className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Sua Conta</h4>

          {/* Status do Plano */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Plano</div>
              <div style={{ fontWeight: 600 }}>{isActive ? 'EdAcademy Pro' : 'Sem plano ativo'}</div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '99px',
              backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              color: isActive ? '#059669' : 'var(--error)',
              border: `1px solid ${isActive ? 'rgba(52, 211, 153, 0.35)' : 'rgba(239, 68, 68, 0.25)'}`,
              letterSpacing: '0.03em',
              textTransform: 'uppercase'
            }}>
              {isActive ? '● Ativo' : '● Inativo'}
            </span>
          </div>

          {/* Idioma com Acesso */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Idioma</div>
              <div style={{ fontWeight: 600 }}>
                {profile?.student_language
                  ? ({'english':'Inglês','spanish':'Espanhol','french':'Francês','portuguese':'Português','german':'Alemão','italian':'Italiano','mandarin':'Mandarim','japanese':'Japonês'} as Record<string,string>)[profile.student_language] ?? profile.student_language
                  : 'Não definido'}
              </div>
            </div>
            {profile?.student_language ? (
              <span style={{ fontSize: '1.3rem' }}>
                {({'english':'🇺🇸','spanish':'🇪🇸','french':'🇫🇷','portuguese':'🇧🇷','german':'🇩🇪','italian':'🇮🇹','mandarin':'🇨🇳','japanese':'🇯🇵'} as Record<string,string>)[profile.student_language] ?? '🌐'}
              </span>
            ) : null}
          </div>

          {/* Fuso Horário */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fuso Horário</div>
              <div style={{ fontWeight: 600 }}>
                {profile?.timezone ? profile.timezone : (clientTz ? `${clientTz} (sincronizado)` : 'Não detectado')}
              </div>
            </div>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>🕒</span>
          </div>

          {/* Vencimento */}
          {subscription?.end_date && (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: isExpired ? 'rgba(239,68,68,0.07)' : isUrgent ? 'rgba(239,68,68,0.07)' : isWarning ? 'rgba(234,179,8,0.07)' : 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: isExpired || isUrgent ? '1.5px solid rgba(239,68,68,0.35)' : isWarning ? '1.5px solid rgba(234,179,8,0.35)' : '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Válido até</div>
                  <div style={{ fontWeight: 600, color: isExpired || isUrgent ? 'var(--error)' : isWarning ? '#CA8A04' : 'var(--text-main)' }}>
                    {new Date(subscription.end_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {isExpired && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', letterSpacing: '0.04em' }}>VENCIDO</span>
                )}
                {isUrgent && !isExpired && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', letterSpacing: '0.04em' }}>URGENTE · {daysUntilExpiry}d</span>
                )}
                {isWarning && !isUrgent && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', backgroundColor: 'rgba(234,179,8,0.15)', color: '#CA8A04', border: '1px solid rgba(234,179,8,0.3)', letterSpacing: '0.04em' }}>ATENÇÃO · {daysUntilExpiry}d</span>
                )}
              </div>
              {(isExpired || isUrgent || isWarning) && (
                <p style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: isExpired || isUrgent ? 'var(--error)' : '#CA8A04', fontWeight: 500, lineHeight: 1.4 }}>
                  {isExpired
                    ? 'Seu plano venceu. Entre em contato para renovar e continuar as aulas.'
                    : isUrgent
                    ? `Seu plano vence em ${daysUntilExpiry === 0 ? 'hoje' : `${daysUntilExpiry} dia${daysUntilExpiry === 1 ? '' : 's'}`}! Renove para não perder as aulas.`
                    : `Seu plano vence em ${daysUntilExpiry} dias. Programe a renovação com antecedência.`
                  }
                </p>
              )}
            </div>
          )}

          {!isActive && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
              Para ativar seu acesso, entre em contato com a equipe EdAcademy.
            </p>
          )}

          {/* Botão PIX — aparece quando admin_master configurou a chave */}
          {pixSettings?.pix_key && (
            <div style={{ marginTop: '1.25rem' }}>
              <PixPaymentModal pix={{
                pix_key: pixSettings.pix_key,
                pix_key_type: pixSettings.pix_key_type ?? null,
                pix_beneficiary_name: pixSettings.pix_beneficiary_name ?? null,
                pix_qr_code_url: pixSettings.pix_qr_code_url ?? null,
              }} />
            </div>
          )}
        </section>
      </div>

      {/* Recorrência Section */}
      <section className="card" style={{ marginBottom: '3rem', border: '1px solid var(--primary-light)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Horários Fixos Recorrentes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Escolha o seu horário oficial do plano (1 por semana).</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(Min(100%, 350px), 1fr))', gap: '2rem' }}>
          {/* Dynamic Form */}
          <RecurringClassForm teachers={teachers || []} userTimezone={userTz} />

          {/* Current Recurring List */}
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', marginBottom: '1rem' }}>Minha Grade Semanal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recurring && recurring.length > 0 ? (
                recurring.map(r => {
                  const [h, m] = r.start_time.split(':').map(Number)
                  // Build a deterministic UTC Date for this recurring slot using the current year/month to avoid DST issues from year 2000
                  const now = new Date()
                  const utcBase = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0))
                  
                  // Adjust to display the correct day of week in the browser's context
                  while (utcBase.getUTCDay() !== r.day_of_week) {
                    utcBase.setUTCDate(utcBase.getUTCDate() + 1)
                  }
                  
                  // Apply 10 mins rule - Always standardize display to class start (+10min)
                  const displayStart = new Date(utcBase.getTime() + 10 * 60 * 1000)
                  
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--primary)', textTransform: 'capitalize' }}>
                          {formatInTimeZone(displayStart, userTz, "EEEE, HH:mm", { locale: ptBR })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prof. {r.teacher?.full_name}</div>
                      </div>
                    <RemoveClassButton classId={r.id} />
                  </div>
                )})
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border)' }}>Você ainda não definiu seu horário fixo.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Atalho para Minhas Aulas */}
      <Link
        href="/dashboard/minhas-aulas"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          marginBottom: '1.5rem',
          transition: 'box-shadow 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>Minhas Aulas</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Ver próximas aulas e histórico completo
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>→</span>
      </Link>


      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 600px) {
          *[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .card[style*="justify-content: space-between"] { flex-direction: column; align-items: flex-start !important; }
          .save-button-container { width: 100%; }
          .save-button-container button { width: 100%; justify-content: center; }
        }
      `}} />
    </div>
  )
}