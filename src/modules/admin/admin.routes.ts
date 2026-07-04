import { Router } from 'express';
import { adminController } from './admin.controller';
import { adminGuard } from '../../middleware/admin-guard';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import {
  createOfferSchema,
  createProductSchema,
  customOrderQuerySchema,
  idParamSchema,
  updateOfferSchema,
  updateOrderStatusSchema,
  updateProductSchema,
} from './admin.schemas';

const router = Router();

// All admin routes require the admin guard (03_DESIGN.md §3.7).
router.use(adminGuard);

// Products CRUD
router.post(
  '/products',
  validate({ body: createProductSchema }),
  asyncHandler(adminController.createProduct),
);
router.put(
  '/products/:id',
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(adminController.updateProduct),
);
router.delete(
  '/products/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminController.deleteProduct),
);

// Offers CRUD
router.post(
  '/offers',
  validate({ body: createOfferSchema }),
  asyncHandler(adminController.createOffer),
);
router.put(
  '/offers/:id',
  validate({ params: idParamSchema, body: updateOfferSchema }),
  asyncHandler(adminController.updateOffer),
);
router.delete(
  '/offers/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminController.deleteOffer),
);

// Manual order status transition (triggers history + notification)
router.patch(
  '/orders/:id/status',
  validate({ params: idParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(adminController.setOrderStatus),
);

// Custom-order queue (needs quote/confirmation)
router.get(
  '/custom-orders',
  validate({ query: customOrderQuerySchema }),
  asyncHandler(adminController.listCustomOrders),
);

export const adminRoutes = router;
