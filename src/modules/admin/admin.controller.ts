import type { Request, Response } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/response';
import { recordAudit } from '../../utils/audit';
import type {
  CreateOfferInput,
  CreateProductInput,
  CustomOrderQuery,
  UpdateOfferInput,
  UpdateOrderStatusInput,
  UpdateProductInput,
} from './admin.schemas';

/** Append an admin-action audit record (actor = the admin key label). */
function auditAdmin(
  req: Request,
  event: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
): void {
  recordAudit({
    event,
    actorType: 'admin',
    actorId: req.admin?.label ?? 'admin',
    targetType,
    targetId,
    ip: req.ip,
    ...(metadata ? { metadata } : {}),
  });
}

export const adminController = {
  // Products
  async createProduct(req: Request, res: Response): Promise<void> {
    const product = await adminService.createProduct(req.body as CreateProductInput);
    auditAdmin(req, 'admin.product.create', 'product', product.id);
    sendSuccess(res, product, 201);
  },
  async updateProduct(req: Request, res: Response): Promise<void> {
    const product = await adminService.updateProduct(
      req.params.id as string,
      req.body as UpdateProductInput,
    );
    auditAdmin(req, 'admin.product.update', 'product', product.id);
    sendSuccess(res, product, 200);
  },
  async deleteProduct(req: Request, res: Response): Promise<void> {
    const product = await adminService.deleteProduct(req.params.id as string);
    auditAdmin(req, 'admin.product.delete', 'product', req.params.id as string);
    sendSuccess(res, product, 200);
  },

  // Offers
  async createOffer(req: Request, res: Response): Promise<void> {
    const offer = await adminService.createOffer(req.body as CreateOfferInput);
    auditAdmin(req, 'admin.offer.create', 'offer', offer.id);
    sendSuccess(res, offer, 201);
  },
  async updateOffer(req: Request, res: Response): Promise<void> {
    const offer = await adminService.updateOffer(
      req.params.id as string,
      req.body as UpdateOfferInput,
    );
    auditAdmin(req, 'admin.offer.update', 'offer', offer.id);
    sendSuccess(res, offer, 200);
  },
  async deleteOffer(req: Request, res: Response): Promise<void> {
    const result = await adminService.deleteOffer(req.params.id as string);
    auditAdmin(req, 'admin.offer.delete', 'offer', req.params.id as string);
    sendSuccess(res, result, 200);
  },

  // Orders
  async setOrderStatus(req: Request, res: Response): Promise<void> {
    const body = req.body as UpdateOrderStatusInput;
    const order = await adminService.setOrderStatus(
      req.params.id as string,
      body,
      req.admin?.label ?? 'admin',
    );
    auditAdmin(req, 'admin.order.status', 'order', order.id, { status: body.status });
    sendSuccess(res, order, 200);
  },

  // Custom orders queue
  async listCustomOrders(req: Request, res: Response): Promise<void> {
    const { status, page, limit } = req.query as unknown as CustomOrderQuery;
    const { items, meta } = await adminService.listCustomOrders(status, page, limit);
    sendSuccess(res, items, 200, meta);
  },
};
