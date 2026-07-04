import type { Request, Response } from 'express';
import { offersService } from './offers.service';
import { analyticsService } from '../../analytics/analytics.service';
import { sendSuccess } from '../../utils/response';

export const offersController = {
  async listActive(_req: Request, res: Response): Promise<void> {
    const offers = await offersService.listActive(new Date());
    // ViewOffer (Epic 6.5) — shared eventId returned for client Pixel dedup.
    const eventId = analyticsService.viewOffer();
    sendSuccess(res, offers, 200, { eventId });
  },
};
