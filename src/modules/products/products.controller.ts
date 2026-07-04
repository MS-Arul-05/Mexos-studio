import type { Request, Response } from 'express';
import { productsService } from './products.service';
import { analyticsService } from '../../analytics/analytics.service';
import { sendSuccess } from '../../utils/response';
import type { ListProductsQuery, ProductSlugParams } from './products.schemas';

export const productsController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListProductsQuery;
    const { items, meta } = await productsService.list(query);
    sendSuccess(res, items, 200, meta);
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as unknown as ProductSlugParams;
    const product = await productsService.getBySlug(slug);
    // ViewProduct (Epic 6.5) — shared eventId returned for client Pixel dedup.
    const eventId = analyticsService.viewProduct({
      id: product.id,
      price: product.price ?? '0',
      currency: product.currency,
    });
    sendSuccess(res, product, 200, { eventId });
  },
};
