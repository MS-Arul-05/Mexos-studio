import { Router } from 'express';
import { healthController } from './health.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

// GET /api/health — combined status (kept for back-compat)
router.get('/', asyncHandler(healthController.get));

// GET /api/health/live — liveness probe (process up; no dependency checks)
router.get('/live', healthController.live);

// GET /api/health/ready — readiness probe (DB reachable; gates the load balancer)
router.get('/ready', asyncHandler(healthController.ready));

export const healthRoutes = router;
