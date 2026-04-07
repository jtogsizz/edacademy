// src/lib/whatsapp/evolution-provider.ts
// Implementação da Evolution API para o serviço de WhatsApp

import { WhatsAppProvider, WhatsAppConfig } from './types';

export class EvolutionProvider implements WhatsAppProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Envia uma mensagem de texto simples para um número específico
   */
  async sendMessage(to: string, message: string) {
    // Sanitização básica do número de destino
    const cleanNumber = to.replace(/\D/g, '');
    
    // Endpoint para envio de texto na Evolution API v1/v2
    const url = `${this.config.apiUrl}/message/sendText/${this.config.instanceName}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
          delay: 1200, // Delay em ms para evitar bloqueios
          linkPreview: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `WhatsApp API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { 
        success: true, 
        messageId: data?.key?.id 
      };
    } catch (error) {
      console.error('[EvolutionProvider] Falha no envio:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
}
