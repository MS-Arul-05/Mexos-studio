import type { Request, Response } from 'express';
import { healthService } from './health.service';
import { sendSuccess } from '../../utils/response';

/**
 * Controller: parse request, call service, shape response. No business logic here.
 */
export const healthController = {
  async get(_req: Request, res: Response): Promise<void> {
    const result = await healthService.check(new Date());
    // 200 when DB is up, 503 when the API is alive but its DB is unreachable.
    const httpStatus = result.db === 'up' ? 200 : 503;
    sendSuccess(res, result, httpStatus);
  },

  /** Liveness probe — always 200 while the process serves (restart signal). */
  live(_req: Request, res: Response): void {
    sendSuccess(res, healthService.liveness(new Date()), 200);
  },

  /** Readiness probe — 200 only when dependencies (DB) are reachable (traffic gate). */
  async ready(_req: Request, res: Response): Promise<void> {
    const result = await healthService.readiness(new Date());
    sendSuccess(res, result, result.status === 'ready' ? 200 : 503);
  },
};
