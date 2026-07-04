import { Router } from 'express';
import { contactController } from './contact.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { createContactSchema } from './contact.schemas';

const router = Router();

// POST /api/contact — inquiry form submission (Epic 6.4)
router.post('/', validate({ body: createContactSchema }), asyncHandler(contactController.create));

export const contactRoutes = router;
