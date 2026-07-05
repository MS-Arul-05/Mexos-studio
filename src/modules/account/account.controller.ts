import type { Request, Response } from 'express';
import { ordersService } from '../orders/orders.service';
import { accountRepository } from './account.repository';
import { customOrdersRepository } from '../custom-orders/custom-orders.repository';
import { serializeCustomOrder } from '../custom-orders/custom-orders.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/app-error';
import type { OrderHistoryQuery } from '../orders/orders.schemas';
import type { CreateAddressInput, UpdateProfileInput } from './account.schemas';

export const accountController = {
  async me(req: Request, res: Response): Promise<void> {
    const user = await accountRepository.findById(req.user!.id);
    if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    sendSuccess(res, {
      id: user.id,
      mobileNumber: user.mobileNumber,
      countryCode: user.countryCode,
      name: user.name,
      createdAt: user.createdAt,
      addresses: user.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        isDefault: a.isDefault,
      })),
    });
  },

  async orders(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query as unknown as OrderHistoryQuery;
    // authGuard guarantees req.user is present.
    const { items, meta } = await ordersService.listForUser(req.user!.id, page, limit);
    sendSuccess(res, items, 200, meta);
  },

  /** PATCH /me — set/update the display name (post-OTP onboarding step). */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const { name } = req.body as UpdateProfileInput;
    const user = await accountRepository.updateName(req.user!.id, name);
    sendSuccess(res, { id: user.id, mobileNumber: user.mobileNumber, name: user.name });
  },

  async createAddress(req: Request, res: Response): Promise<void> {
    const address = await accountRepository.createAddress(
      req.user!.id,
      req.body as CreateAddressInput,
    );
    sendSuccess(res, address, 201);
  },

  async deleteAddress(req: Request, res: Response): Promise<void> {
    const removed = await accountRepository.deleteAddress(req.user!.id, req.params.id as string);
    if (!removed) throw AppError.notFound('Address not found', 'ADDRESS_NOT_FOUND');
    sendSuccess(res, { deleted: true });
  },

  /** GET /custom-orders — the user's saved designs (account page tab). */
  async customOrders(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const { items, total } = await customOrdersRepository.listByUser(req.user!.id, page, limit);
    sendSuccess(res, items.map(serializeCustomOrder), 200, { page, limit, total });
  },
};
