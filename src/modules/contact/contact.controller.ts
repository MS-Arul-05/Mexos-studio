import type { Request, Response } from 'express';
import { contactService } from './contact.service';
import { sendSuccess } from '../../utils/response';
import type { CreateContactInput } from './contact.schemas';

export const contactController = {
  async create(req: Request, res: Response): Promise<void> {
    const result = await contactService.create(req.body as CreateContactInput);
    sendSuccess(res, { ...result, received: true }, 201);
  },
};
