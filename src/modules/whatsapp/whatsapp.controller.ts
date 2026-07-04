import type { Request, Response } from 'express';
import { whatsappService, type ChatLinkRequester } from './whatsapp.service';
import { whatsappWebhookService } from './whatsapp-webhook.service';
import { sendSuccess } from '../../utils/response';
import { verifyGuestOrderToken } from '../../utils/jwt';
import type { ChatLinkQuery } from './whatsapp.schemas';

function guestOrderIdOf(req: Request): string | undefined {
  const raw = (req.header('x-guest-token') ?? (req.query.guestToken as string | undefined))?.trim();
  if (!raw) return undefined;
  return verifyGuestOrderToken(raw)?.orderId;
}

const requesterOf = (req: Request): ChatLinkRequester => ({
  userId: req.user?.id,
  guestOrderId: guestOrderIdOf(req),
});

export const whatsappController = {
  async chatLink(req: Request, res: Response): Promise<void> {
    const link = await whatsappService.buildChatLink(
      req.query as unknown as ChatLinkQuery,
      requesterOf(req),
    );
    sendSuccess(res, link, 200);
  },

  // Meta webhook verification (GET) — must echo hub.challenge as plain text.
  verifyWebhook(req: Request, res: Response): void {
    const challenge = whatsappWebhookService.verifyHandshake(
      req.query as Record<string, string | undefined>,
    );
    res.status(200).type('text/plain').send(challenge);
  },

  // Meta webhook events (POST) — delivery receipts / inbound messages.
  async receiveWebhook(req: Request, res: Response): Promise<void> {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    const signature = req.header('x-hub-signature-256');
    const result = await whatsappWebhookService.handleInbound(rawBody, signature, req.body);
    sendSuccess(res, { received: true, logged: result.logged }, 200);
  },
};
