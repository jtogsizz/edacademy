// src/app/api/webhooks/whatsapp/route.ts
// Endpoint de Webhook para processar comandos da assistente e atualizar o banco de dados

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp/service';

// Cliente Admin para operações em background via service_role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Extração de Mensagem (Compatível v1/v2 Evolution API)
    // Buscamos o texto tanto no corpo simples quanto em mensagens estendidas
    const messageData = payload.data?.message;
    const textMessage = messageData?.conversation || messageData?.extendedTextMessage?.text || '';

    if (!textMessage) {
      return NextResponse.json({ message: 'Nenhuma mensagem de texto encontrada' });
    }

    // 2. Segurança: Validar Remetente (Número da Assistente)
    // Somente mensagens vindas da assistente autorizada podem processar comandos
    const remoteJid = payload.data?.key?.remoteJid || '';
    const senderNumber = remoteJid.split('@')[0];
    const assistantNumber = (process.env.ASSISTANT_WHATSAPP_NUMBER || '').replace(/\D/g, '');

    // Bloquear se o número da assistente não estiver configurado
    if (!assistantNumber) {
      console.error('[Webhook] ASSISTANT_WHATSAPP_NUMBER não configurada.');
      return NextResponse.json(
        { error: 'Assistente não configurada nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    // Bloquear remetentes que não sejam a assistente
    if (senderNumber !== assistantNumber) {
      console.warn(`[Webhook] Mensagem de número desautorizado bloqueada: ${senderNumber}`);
      return NextResponse.json({ message: 'Acesso Não Autorizado' }, { status: 403 });
    }

    // 3. Analisar Comando Recebido (Ex: PAGO A1B2C3 ou NAO_PAGO A1B2C3)
    const command = whatsappService.parseCommand(textMessage);
    if (!command) {
      return NextResponse.json(
        { error: 'Formato de comando inválido para renovação' },
        { status: 400 }
      );
    }

    // 4. Localização e Validação do Lembrete (Idempotência)
    const { data: renewal, error: renewalError } = await supabaseAdmin
      .from('subscription_renewals')
      .select('*, subscriptions(*)')
      .eq('short_code', command.shortCode)
      .maybeSingle();

    if (renewalError || !renewal) {
      return NextResponse.json(
        { error: 'Código de renovação não localizado no sistema' },
        { status: 404 }
      );
    }

    // Impedir reprocessamento se o lembrete já estiver concluído
    if (renewal.status === 'paid' || renewal.status === 'inactive') {
      console.log(`[Webhook] O código ${command.shortCode} já consta como processado (${renewal.status}).`);
      return NextResponse.json({ message: 'Lembrete já concluído anteriormente' });
    }

    // 5. Execução da Lógica de Negócio e Auditoria
    try {
      if (command.type === 'PAGO') {
        const sub = renewal.subscriptions;
        let newEndDate = new Date();
        const currentEnd = new Date(sub.end_date);
        const today = new Date();
        today.setHours(0,0,0,0);

        /**
         * REGRA DE RENOVAÇÃO:
         * Se assinatura ainda está no prazo: Soma 30 dias ao vencimento atual
         * Se assinatura já expirou: Soma 30 dias a partir de HOJE
         */
        const isNotExpired = currentEnd >= today;
        if (isNotExpired) {
          newEndDate = new Date(currentEnd);
        }
        
        newEndDate.setDate(newEndDate.getDate() + 30);
        const formattedDate = newEndDate.toISOString().split('T')[0];

        // A. Atualizar Assinatura do Aluno
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            end_date: formattedDate,
          })
          .eq('id', sub.id);

        if (subErr) throw subErr;

        // B. Atualizar e Auditar Registro de Lembrete
        const { error: renewalUpdateErr } = await supabaseAdmin
          .from('subscription_renewals')
          .update({
            status: 'paid',
            processed_at: new Date().toISOString(),
            response_text: textMessage,
            response_from: senderNumber,
          })
          .eq('id', renewal.id);

        if (renewalUpdateErr) throw renewalUpdateErr;

        console.log(`[Webhook] Sucesso: Código ${command.shortCode} renovou assinatura ${sub.id} até ${formattedDate}`);

      } else if (command.type === 'NAO_PAGO') {
        // Aluno optou por não renovar no momento -> Marcar assinatura como inativa
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'inactive' })
          .eq('id', renewal.subscription_id);

        if (subErr) throw subErr;

        // Auditar lembrete como 'inactive'
        const { error: renewalUpdateErr } = await supabaseAdmin
          .from('subscription_renewals')
          .update({
            status: 'inactive',
            processed_at: new Date().toISOString(),
            response_text: textMessage,
            response_from: senderNumber,
          })
          .eq('id', renewal.id);

        if (renewalUpdateErr) throw renewalUpdateErr;

        console.log(`[Webhook] Sucesso: Assinatura ${renewal.subscription_id} inativada via código ${command.shortCode}`);
      }

      return NextResponse.json({ success: true, command: command.type });

    } catch (saveError) {
      console.error('[Webhook] Falha crítica na gravação dos dados:', saveError);
      return NextResponse.json({ error: 'Erro interno ao persistir dados de renovação' }, { status: 500 });
    }

  } catch (error) {
    console.error('[Webhook] Falha global no processamento:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
