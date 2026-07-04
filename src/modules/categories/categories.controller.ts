import type { Request, Response } from 'express';
import { categoriesService } from './categories.service';
import { sendSuccess } from '../../utils/response';

export const categoriesController = {
  async tree(_req: Request, res: Response): Promise<void> {
    const tree = await categoriesService.tree();
    sendSuccess(res, tree, 200);
  },
};
