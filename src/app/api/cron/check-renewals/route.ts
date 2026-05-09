// src/app/api/cron/check-renewals/route.ts
// Tarefa agendada diária para localizar vencimentos e notificar assistente

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp/service';

/**
 * Inicializa o cliente Supabase Admin sob demanda, validando as credenciais.
 * Evita erros durante a importação do módulo no Next.js.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      'Configuração do Supabase incompleta (URL ou SERVICE_ROLE_KEY ausentes).'
    );
  }

  return createClient(url, serviceRole);
}

/**
 * Gera um short_code único com validação direta no banco sua unicidade.
 * Tenta até 10 vezes gerar uma seqüência não utilizada.
 */
async function generateUniqueShortCode(supabase: any): Promise<string> {
  let isUnique = false;
  let code = '';
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    code = whatsappService.generateShortCode();
    
    if (code) {
      const { data } = await supabase
        .from('subscription_renewals')
        .select('id')
        .eq('short_code', code)
        .maybeSingle();
        
      if (!data) isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Falha ao gerar short_code único após 10 tentativas.');
  }

  return code;
}

export async function GET(request: Request) {
  // 1. Proteção por Cron Secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Inicializa o admin apenas aqui, dentro da execução da rota
    const supabaseAdmin = getSupabaseAdmin();

    // Definimos a data alvo como daqui a exatamente 3 dias
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const dateString = targetDate.toISOString().split('T')[0];

    // Buscar assinaturas ativas com o perfil do aluno (nome + whatsapp)
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, profiles:student_id(full_name, whatsapp_number)')
      .eq('status', 'active')
      .eq('end_date', dateString);

    if (error) {
      console.error('[Cron] Falha ao buscar assinaturas:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'Nenhuma assinatura para notificar hoje.' });
    }

    const results = [];

    for (const sub of subscriptions) {
      // 1. Evitar Duplicidade: Ignorar se já houver registro 'pending' ou 'sent' para a sub
      const { data: existing } = await supabaseAdmin
        .from('subscription_renewals')
        .select('id, status')
        .eq('subscription_id', sub.id)
        .in('status', ['pending', 'sent'])
        .maybeSingle();

      if (existing) {
        results.push({ sub_id: sub.id, status: `skipped (${existing.status})` });
        continue;
      }

      // 2. Gerar Short Code Único (garante unicidade no banco)
      const shortCode = await generateUniqueShortCode(supabaseAdmin);
      const studentName = sub.profiles?.full_name || 'Estudante';
      const studentWhatsApp = sub.profiles?.whatsapp_number;

      // 3. Inserir Registro Inicial como 'pending'
      const { data: renewal, error: insertError } = await supabaseAdmin
        .from('subscription_renewals')
        .insert({
          subscription_id: sub.id,
          short_code: shortCode,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[Cron] Erro ao criar registro para ${sub.id}:`, insertError);
        continue;
      }

      // 4. Tentativa Real de Envio via WhatsApp
      const waResult = await whatsappService.sendRenewalReminder(
        studentName, 
        shortCode, 
        studentWhatsApp
      );

      if (waResult.success) {
        // Sucesso no Envio: Marcar como 'sent' e registrar data
        await supabaseAdmin
          .from('subscription_renewals')
          .update({
            status: 'sent',
            reminded_at: new Date().toISOString(),
          })
          .eq('id', renewal.id);
      } else {
        // Falha no Envio: Marcar como 'failed' e registrar o erro retornado
        await supabaseAdmin
          .from('subscription_renewals')
          .update({
            status: 'failed',
            send_error: waResult.error || 'Erro desconhecido na API do WhatsApp',
          })
          .eq('id', renewal.id);
      }

      results.push({
        sub_id: sub.id,
        student: studentName,
        short_code: shortCode,
        whatsapp: waResult.success ? 'sent' : 'failed',
      });
    }

    return NextResponse.json({
      processed_count: subscriptions.length,
      details: results,
    });

  } catch (error) {
    console.error('[Cron] Erro Global:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
