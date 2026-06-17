const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(supabaseUrl, supabaseKey);

async function testAction(userId) {
  const { data: sub, error: fetchErr } = await adminClient
    .from('subscriptions')
    .select('status, end_date')
    .eq('student_id', userId)
    .single()

  console.log('[DEBUG] user_id:', userId)
  console.log('[DEBUG] sub found:', sub)

  if (sub) {
    if (sub.status === 'pending_confirmation') {
      console.log('[DEBUG] Bloqueado: Já pendente')
      return { success: false }
    }

    if (sub.status === 'active') {
      if (!sub.end_date) {
        console.log('[DEBUG] Bloqueado: Ativa sem end_date')
        return { error: 'Assinatura ativa não possui data de vencimento.' }
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(sub.end_date)
      expiry.setHours(0, 0, 0, 0)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      console.log('[DEBUG] diasRestantes:', daysUntilExpiry)

      if (daysUntilExpiry > 7) {
        console.log('[DEBUG] Bloqueado: > 7 dias')
        return { error: 'O plano ainda tem mais de 7 dias de validade.' }
      }
    }
  }

  // Update
  if (sub) {
    console.log('[DEBUG] Executando update...')
    const { error, count } = await adminClient
      .from('subscriptions')
      .update({ 
        status: 'pending_confirmation',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', userId)
      .select()

    console.log('[DEBUG] update result:', { error, count: count || (error ? null : 'sucesso, select retornou dados') })
    if (error) return { error: error.message }
  }

  // Sanity
  const { data: finalSub } = await adminClient
    .from('subscriptions')
    .select('status')
    .eq('student_id', userId)
    .single()

  console.log('[DEBUG] status após update:', finalSub?.status)

  if (finalSub?.status !== 'pending_confirmation') {
    return { error: 'Falha ao atualizar o status no banco de dados. Tente novamente.' }
  }

  return { success: true }
}

testAction('ddbfa7be-2d20-4ec1-a29f-140e5180b3cc').then(res => console.log('Result:', res));
