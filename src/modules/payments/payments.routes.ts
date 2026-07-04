import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/optional-auth';
import { asyncHandler } from '../../utils/async-handler';
import { checkoutSchema, paymentIdSchema } from './payments.schemas';

const router = Router();

// POST /api/payments/checkout — create gateway session for an order (Epic 5.2)
router.post(
  '/checkout',
  optionalAuth,
  validate({ body: checkoutSchema }),
  asyncHandler(paymentsController.checkout),
);

// POST /api/payments/webhook — gateway server-to-server webhook (Epic 5.3)
// No auth: authenticity is proven by the signature over the raw body.
router.post('/webhook', asyncHandler(paymentsController.webhook));

// POST /api/payments/:id/retry — regenerate a checkout session (Epic 5.4)
router.post(
  '/:id/retry',
  optionalAuth,
  validate({ params: paymentIdSchema }),
  asyncHandler(paymentsController.retry),
);

export const paymentsRoutes = router;
