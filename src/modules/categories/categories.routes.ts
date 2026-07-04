import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// GET /api/categories — category tree (Epic 6.1)
router.get('/', asyncHandler(categoriesController.tree));

export const categoriesRoutes = router;
