import { Router } from 'express';
import { whatsappController } from './whatsapp.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/optional-auth';
import { asyncHandler } from '../../utils/async-handler';
import { chatLinkQuerySchema } from './whatsapp.schemas';

const router = Router();

// GET /api/whatsapp/chat-link — build a wa.me deep link (Epic 4.1)
router.get(
  '/chat-link',
  optionalAuth,
  validate({ query: chatLinkQuerySchema }),
  asyncHandler(whatsappController.chatLink),
);

// GET /api/whatsapp/webhook — Meta verification handshake (Epic 4.5)
router.get('/webhook', whatsappController.verifyWebhook);

// POST /api/whatsapp/webhook — delivery receipts / inbound messages (Epic 4.5)
router.post('/webhook', asyncHandler(whatsappController.receiveWebhook));

export const whatsappRoutes = router;
