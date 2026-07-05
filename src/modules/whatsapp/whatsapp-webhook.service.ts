import { env } from '../../config/env';
import { hmacSha256Hex, safeEqualHex } from '../../utils/crypto';
import { AppError } from '../../utils/app-error';
import { whatsappRepository } from './whatsapp.repository';

interface HandshakeQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export const whatsappWebhookService = {
  /**
   * Meta webhook verification (Epic 4.5). On setup Meta issues a GET with
   * hub.mode=subscribe + hub.verify_token; we must echo hub.challenge as plain text
   * when the token matches our configured verify token.
   */
  verifyHandshake(query: HandshakeQuery): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
      return challenge;
    }
    throw AppError.forbidden('Webhook verification failed', 'WEBHOOK_VERIFY_FAILED');
  },

  /**
   * Handle an inbound webhook (delivery receipts + inbound messages). Verifies the
   * X-Hub-Signature-256 when an app secret is configured, then logs statuses/messages
   * to WhatsAppMessageLog. Always acks (200) for accepted events.
   */
  async handleInbound(
    rawBody: Buffer,
    signature: string | undefined,
    parsedBody: unknown,
  ): Promise<{ logged: number }> {
    if (!env.WHATSAPP_APP_SECRET) {
      throw AppError.internal(
        'WHATSAPP_APP_SECRET not configured — cannot verify webhook signature',
        'WEBHOOK_SECRET_MISSING',
      );
    }
    const expected = `sha256=${hmacSha256Hex(rawBody, env.WHATSAPP_APP_SECRET)}`;
    const provided = signature ?? '';
    const ok =
      provided.startsWith('sha256=') &&
      safeEqualHex(expected.slice('sha256='.length), provided.slice('sha256='.length));
    if (!ok) {
      throw AppError.unauthorized('Invalid webhook signature', 'INVALID_SIGNATURE');
    }

    const body = (parsedBody ?? {}) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            statuses?: Array<{ status?: string; recipient_id?: string }>;
            messages?: Array<{ from?: string; id?: string }>;
          };
        }>;
      }>;
    };

    let logged = 0;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const status of value.statuses ?? []) {
          await whatsappRepository.log({
            toNumber: status.recipient_id ?? 'unknown',
            status: status.status ?? 'unknown',
            payload: status,
          });
          logged += 1;
        }
        for (const message of value.messages ?? []) {
          await whatsappRepository.log({
            toNumber: message.from ?? 'unknown',
            status: 'received',
            payload: message,
          });
          logged += 1;
        }
      }
    }

    return { logged };
  },
};
