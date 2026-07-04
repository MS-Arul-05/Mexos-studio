import { Router } from 'express';
import { offersController } from './offers.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// GET /api/offers — active offers (Epic 6.1)
router.get('/', asyncHandler(offersController.listActive));

export const offersRoutes = router;
