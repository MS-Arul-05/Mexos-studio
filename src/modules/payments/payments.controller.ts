import type { Request, Response } from 'express';
import { paymentsService, type PaymentRequester } from './payments.service';
import { sendSuccess } from '../../utils/response';
import { verifyGuestOrderToken } from '../../utils/jwt';
import type { CheckoutInput } from './payments.schemas';

function guestOrderIdOf(req: Request): string | undefined {
  const raw = (req.header('x-guest-token') ?? (req.query.guestToken as string | undefined))?.trim();
  if (!raw) return undefined;
  return verifyGuestOrderToken(raw)?.orderId;
}

const requesterOf = (req: Request): PaymentRequester => ({
  userId: req.user?.id,
  guestOrderId: guestOrderIdOf(req),
});

export const paymentsController = {
  async checkout(req: Request, res: Response): Promise<void> {
    const { orderId } = req.body as CheckoutInput;
    const result = await paymentsService.checkout(orderId, requesterOf(req));
    sendSuccess(res, result, 201);
  },

  async retry(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.retry(req.params.id as string, requesterOf(req));
    sendSuccess(res, result, 201);
  },

  async webhook(req: Request, res: Response): Promise<void> {
    // rawBody is captured by the express.json verify hook (see app.ts).
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    const signature = req.header('x-razorpay-signature') ?? req.header('x-webhook-signature');
    const result = await paymentsService.handleWebhook(rawBody, signature, req.body);
    sendSuccess(res, { received: true, handled: result.handled }, 200);
  },
};
