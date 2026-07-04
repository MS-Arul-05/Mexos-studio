import { Router } from 'express';
import { ordersController } from './orders.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/optional-auth';
import { asyncHandler } from '../../utils/async-handler';
import { createOrderSchema, orderIdSchema, trackOrderSchema } from './orders.schemas';

const router = Router();

// POST /api/orders — create order from cart (guest or authenticated)
router.post(
  '/',
  optionalAuth,
  validate({ body: createOrderSchema }),
  asyncHandler(ordersController.create),
);

// GET /api/orders/track — guest tracking by orderId + mobile (before /:id)
router.get('/track', validate({ query: trackOrderSchema }), asyncHandler(ordersController.track));

// GET /api/orders/:id — order detail (owner or guest-order token)
router.get(
  '/:id',
  optionalAuth,
  validate({ params: orderIdSchema }),
  asyncHandler(ordersController.getById),
);

export const ordersRoutes = router;
