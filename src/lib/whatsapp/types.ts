// src/lib/whatsapp/types.ts
// Definições de tipos para o sistema de mensageria WhatsApp

export interface WhatsAppProvider {
  sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export type WhatsAppConfig = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

export type RenewalCommand = {
  type: 'PAGO' | 'NAO_PAGO';
  shortCode: string;
};

// Status válidos para o sistema de renovação
export type RenewalStatus = 'pending' | 'sent' | 'paid' | 'inactive' | 'failed';
