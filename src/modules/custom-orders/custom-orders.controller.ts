import type { Request, Response } from 'express';
import { customOrdersService, type Requester } from './custom-orders.service';
import { analyticsService } from '../../analytics/analytics.service';
import { sendSuccess } from '../../utils/response';
import type {
  AttachFileInput,
  CreateCustomOrderInput,
  UpdateCustomOrderInput,
  UploadUrlInput,
} from './custom-orders.schemas';

const requesterOf = (req: Request): Requester => ({ userId: req.user?.id });

export const customOrdersController = {
  async create(req: Request, res: Response): Promise<void> {
    const order = await customOrdersService.create(
      req.body as CreateCustomOrderInput,
      requesterOf(req),
    );
    sendSuccess(res, order, 201);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const order = await customOrdersService.getById(req.params.id as string, requesterOf(req));
    sendSuccess(res, order, 200);
  },

  async update(req: Request, res: Response): Promise<void> {
    const order = await customOrdersService.update(
      req.params.id as string,
      req.body as UpdateCustomOrderInput,
      requesterOf(req),
    );
    sendSuccess(res, order, 200);
  },

  async uploadUrl(req: Request, res: Response): Promise<void> {
    const result = await customOrdersService.createUploadUrl(
      req.params.id as string,
      req.body as UploadUrlInput,
      requesterOf(req),
    );
    sendSuccess(res, result, 200);
  },

  async attachFile(req: Request, res: Response): Promise<void> {
    const { uploadedFileKey, uploadedFileUrl } = req.body as AttachFileInput;
    const order = await customOrdersService.attachFile(
      req.params.id as string,
      { uploadedFileKey, uploadedFileUrl },
      requesterOf(req),
    );
    sendSuccess(res, order, 200);
  },

  async submit(req: Request, res: Response): Promise<void> {
    const order = await customOrdersService.submit(req.params.id as string, requesterOf(req));
    // SubmitCustomDesign (Epic 6.5) — shared eventId returned for client Pixel dedup.
    const eventId = analyticsService.submitCustomDesign({ id: order.id });
    sendSuccess(res, order, 200, { eventId });
  },
};
