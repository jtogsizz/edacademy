import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function GET(request: Request) {
  // Autenticação para a Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const supabase = await createAdminClient()

    // Buscamos toda a gerência operacional (admin_master, suporte, dev)
    const { data: masters } = await supabase.from('profiles').select('id').in('role', ['admin_master', 'suporte', 'dev'])
    const masterIds = masters?.map(m => m.id) || []

    const todayDateStr = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

    // --------------------------------------------------------------------------------
    // LÓGICA 1: ASSINATURAS VENCIDAS
    // --------------------------------------------------------------------------------
    // Buscamos quem tem plano ativo, mas o end_date já passou ou é hoje
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('id, student_id, profiles!subscriptions_student_id_fkey(full_name, is_active)')
      .eq('status', 'active')
      .lte('end_date', todayDateStr)

    if (expiredSubs && expiredSubs.length > 0) {
      for (const sub of expiredSubs) {
        // 1. Atualizar para inativo na tabela de subscriptions
        await supabase
          .from('subscriptions')
          .update({ status: 'inactive' })
          .eq('id', sub.id)

        // 2. Atualizar profile para inativo também (para bloquear login completo se necessário)
        // Isso assume que temos is_active no profile (adicionado no schema anteriormente ou default de sistemas SaaS)
        // Se a coluna is_active existir no model, faz update:
        const profileData = sub.profiles as any
        if (profileData && profileData.is_active !== undefined) {
          // Precisamos usar set_config('edacademy.allow_profile_system_update', 'true') ou createAdminClient passa via RLS?
          // Como createAdminClient usa Service Role, ele bypassa RLS, MAS as Triggers rodam como postgres superuser
          // Na nossa trigger: IF current_user = 'authenticated' THEN
          // Service Role autentica como 'anon' ou 'service_role', não 'authenticated'.
          // Logo a trigger não barrará o service role de alterar o is_active.
          await supabase
            .from('profiles')
            .update({ is_active: false })
            .eq('id', sub.student_id)
        }

        const studentName = profileData?.full_name || 'Aluno'

        // 3. Avisar o Aluno
        await createNotification({
          userId: sub.student_id,
          type: 'system_alert',
          title: 'Assinatura Expirada',
          body: 'Seu plano expirou. Para continuar marcando aulas e não perder seu horário fixo, renove sua assinatura.',
          metadata: { type: 'subscription_expired' }
        })

        // 4. Avisar a Gerência Estendida
        for (const masterId of masterIds) {
          await createNotification({
            userId: masterId,
            type: 'system_alert',
            title: 'Alerta de Vencimento',
            body: `${studentName} teve o plano vencido hoje e seu acesso foi pausado. Necessita de contato comercial.`,
            metadata: { studentId: sub.student_id, type: 'subscription_expired_admin' }
          })
        }
      }
    }

    // NOTA: crédito de reposição é concedido pelo sistema no cancelamento/remarcação.
    // Saldo zero é o estado padrão — não deve gerar alerta ao aluno.

    return NextResponse.json({ 
      success: true, 
      expiredProcessed: expiredSubs?.length || 0,
    })

  } catch (err: any) {
    console.error('[CRON RETENTION] Error:', err.message)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

