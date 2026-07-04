import type { Request, Response } from 'express';
import { ordersService, type OrderRequester } from './orders.service';
import { sendSuccess } from '../../utils/response';
import { verifyGuestOrderToken } from '../../utils/jwt';
import type { CreateOrderInput, TrackOrderQuery } from './orders.schemas';

/** Read an optional guest-order token from header or query and resolve its orderId. */
function guestOrderIdOf(req: Request): string | undefined {
  const raw = (req.header('x-guest-token') ?? (req.query.guestToken as string | undefined))?.trim();
  if (!raw) return undefined;
  return verifyGuestOrderToken(raw)?.orderId;
}

const requesterOf = (req: Request): OrderRequester => ({
  userId: req.user?.id,
  guestOrderId: guestOrderIdOf(req),
});

export const ordersController = {
  async create(req: Request, res: Response): Promise<void> {
    const order = await ordersService.create(req.body as CreateOrderInput, requesterOf(req));
    sendSuccess(res, order, 201);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const order = await ordersService.getById(req.params.id as string, requesterOf(req));
    sendSuccess(res, order, 200);
  },

  async track(req: Request, res: Response): Promise<void> {
    const { orderId, mobile } = req.query as unknown as TrackOrderQuery;
    const order = await ordersService.track(orderId, mobile);
    sendSuccess(res, order, 200);
  },
};
