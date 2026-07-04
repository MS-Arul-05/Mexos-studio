import { Router } from 'express';
import { productsController } from './products.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { listProductsSchema, productSlugSchema } from './products.schemas';

const router = Router();

// GET /api/products — list with filters, search, pagination (Epic 6.1)
router.get('/', validate({ query: listProductsSchema }), asyncHandler(productsController.list));

// GET /api/products/:slug — product detail
router.get(
  '/:slug',
  validate({ params: productSlugSchema }),
  asyncHandler(productsController.getBySlug),
);

export const productsRoutes = router;
