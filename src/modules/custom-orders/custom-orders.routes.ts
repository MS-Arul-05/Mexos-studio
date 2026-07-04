import { Router } from 'express';
import { customOrdersController } from './custom-orders.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/optional-auth';
import { asyncHandler } from '../../utils/async-handler';
import {
  attachFileSchema,
  createCustomOrderSchema,
  customOrderIdSchema,
  updateCustomOrderSchema,
  uploadUrlSchema,
} from './custom-orders.schemas';

const router = Router();

// All custom-order routes accept both guests and logged-in users.
router.use(optionalAuth);

// POST /api/custom-orders — create draft (03_DESIGN.md §3.3)
router.post(
  '/',
  validate({ body: createCustomOrderSchema }),
  asyncHandler(customOrdersController.create),
);

// GET /api/custom-orders/:id — fetch (owner or capability-by-id)
router.get(
  '/:id',
  validate({ params: customOrderIdSchema }),
  asyncHandler(customOrdersController.getById),
);

// PATCH /api/custom-orders/:id — update fields (DRAFT only)
router.patch(
  '/:id',
  validate({ params: customOrderIdSchema, body: updateCustomOrderSchema }),
  asyncHandler(customOrdersController.update),
);

// POST /api/custom-orders/:id/upload-url — pre-signed S3 upload URL
router.post(
  '/:id/upload-url',
  validate({ params: customOrderIdSchema, body: uploadUrlSchema }),
  asyncHandler(customOrdersController.uploadUrl),
);

// PATCH /api/custom-orders/:id/attach-file — confirm uploaded file URL
router.patch(
  '/:id/attach-file',
  validate({ params: customOrderIdSchema, body: attachFileSchema }),
  asyncHandler(customOrdersController.attachFile),
);

// POST /api/custom-orders/:id/submit — mark SUBMITTED (or QUOTED for INSTANT)
router.post(
  '/:id/submit',
  validate({ params: customOrderIdSchema }),
  asyncHandler(customOrdersController.submit),
);

export const customOrdersRoutes = router;
