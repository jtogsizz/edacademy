// src/lib/whatsapp/service.ts
// Lógica de negócio do sistema de renovação EdAcademy via WhatsApp

import { EvolutionProvider } from './evolution-provider';
import { WhatsAppProvider, RenewalCommand } from './types';

export class WhatsAppService {
  private provider: WhatsAppProvider | null = null;

  constructor() {
    // O constructor não deve lançar erros para evitar quebras na importação do módulo
    // A validação será feita apenas no momento do uso (sendRenewalReminder)
  }

  /**
   * Método privado para instanciar o provider apenas quando necessário,
   * validando as variáveis de ambiente.
   */
  private getProvider(): { provider: WhatsAppProvider | null; error?: string } {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instanceName = process.env.WHATSAPP_INSTANCE_NAME;

    if (!apiUrl || !apiKey || !instanceName) {
      return { 
        provider: null, 
        error: 'Configuração de WhatsApp incompleta (API_URL, API_KEY ou INSTANCE_NAME ausentes).' 
      };
    }

    if (!this.provider) {
      this.provider = new EvolutionProvider({ apiUrl, apiKey, instanceName });
    }

    return { 
      provider: this.provider 
    };
  }

  /**
   * Envia o lembrete de renovação formatado para a assistente.
   * Valida as configurações de ambiente (Provider + Assistente) no momento da execução.
   */
  async sendRenewalReminder(studentName: string, shortCode: string, studentWhatsApp?: string) {
    const assistantPhone = process.env.ASSISTANT_WHATSAPP_NUMBER || '';
    
    // 1. Validar número da assistente
    if (!assistantPhone) {
      console.warn('[WhatsAppService] ASSISTANT_WHATSAPP_NUMBER não definida.');
      return { success: false, error: 'Número da assistente (ASSISTANT_WHATSAPP_NUMBER) não configurado.' };
    }

    // 2. Tentar obter o provider validado
    const { provider, error } = this.getProvider();
    if (!provider) {
      console.error(`[WhatsAppService] ${error}`);
      return { success: false, error: error };
    }

    const waDisplay = studentWhatsApp || '_WhatsApp do aluno não informado_';

    const message = `🚨 *Lembrete de Vencimento* 🚨\n\n` +
      `👤 Aluno: *${studentName}*\n` +
      `📱 WhatsApp Aluno: *${waDisplay}*\n` +
      `📅 Vence em: *3 dias*\n\n` +
      `---------------------------\n` +
      `📋 *Mensagem para copiar e enviar ao aluno:*\n\n` +
      `"Olá ${studentName}! Percebi que sua assinatura da EdAcademy vence em 3 dias. Gostaria de renovar para continuarmos com as suas aulas no próximo período?"\n\n` +
      `---------------------------\n` +
      `✅ *Para registrar a resposta da assistente:*\n\n` +
      `Se pago responda: \`PAGO ${shortCode}\`\n` +
      `Se não pago responda: \`NAO_PAGO ${shortCode}\``;

    return provider.sendMessage(assistantPhone, message);
  }

  /**
   * Analisa mensagens do Webhook para identificar se contêm um comando de renovação válido.
   * Padrão esperado: "PAGO [6-CHARS]" ou "NAO_PAGO [6-CHARS]"
   */
  parseCommand(text: string): RenewalCommand | null {
    if (!text) return null;
    
    const upperText = text.trim().toUpperCase();
    
    // Regex para validar: [COMANDO] [6-CARACTERES-ALFANUMERICOS]
    const match = upperText.match(/^(PAGO|NAO_PAGO)\s+([A-Z0-9]{6})$/);
    
    if (!match) return null;

    return {
      type: match[1] as 'PAGO' | 'NAO_PAGO',
      shortCode: match[2],
    };
  }

  /**
   * Gera um código alfanumérico curto e aleatório para identificação do lembrete.
   */
  generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Exporta singleton para reúso no Next.js
export const whatsappService = new WhatsAppService();
