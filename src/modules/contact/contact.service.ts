import { contactRepository } from './contact.repository';
import type { CreateContactInput } from './contact.schemas';

export const contactService = {
  async create(input: CreateContactInput): Promise<{ id: string; createdAt: Date }> {
    const inquiry = await contactRepository.create({
      name: input.name,
      email: input.email ?? null,
      mobile: input.mobile ?? null,
      message: input.message,
    });
    return { id: inquiry.id, createdAt: inquiry.createdAt };
  },
};
