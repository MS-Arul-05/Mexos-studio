import { Router } from 'express';
import { accountController } from './account.controller';
import { authGuard } from '../../middleware/auth-guard';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { orderHistoryQuerySchema } from '../orders/orders.schemas';
import { addressIdSchema, createAddressSchema, updateProfileSchema } from './account.schemas';

const router = Router();

// All account routes require authentication.
router.use(authGuard);

// GET /api/account/me — authenticated profile
router.get('/me', asyncHandler(accountController.me));

// PATCH /api/account/me — set/update display name (post-OTP onboarding step)
router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(accountController.updateProfile),
);

// GET /api/account/orders — authenticated order history (Epic 6.3)
router.get(
  '/orders',
  validate({ query: orderHistoryQuerySchema }),
  asyncHandler(accountController.orders),
);

// Address book (account page)
router.post(
  '/addresses',
  validate({ body: createAddressSchema }),
  asyncHandler(accountController.createAddress),
);
router.delete(
  '/addresses/:id',
  validate({ params: addressIdSchema }),
  asyncHandler(accountController.deleteAddress),
);

// GET /api/account/custom-orders — "Saved Designs" tab
router.get('/custom-orders', asyncHandler(accountController.customOrders));

export const accountRoutes = router;
