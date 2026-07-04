import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';

/**
 * Thin Meta Cloud API (Graph) client for sending WhatsApp messages. Constructed
 * only when the Meta provider is active (token + phone number id present).
 */
export function createGraphClient() {
  const token = env.WHATSAPP_API_TOKEN!;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID!;
  const url = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${phoneNumberId}/messages`;

  return {
    async sendMessage(payload: Record<string, unknown>): Promise<{ id?: string }> {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw AppError.internal(
          `WhatsApp send failed: ${res.status} ${text}`,
          'WHATSAPP_SEND_ERROR',
        );
      }
      const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
      return { id: data.messages?.[0]?.id };
    },
  };
}
