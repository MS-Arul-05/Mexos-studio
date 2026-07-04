import { z } from 'zod';

const mobileNumber = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'contactMobile must be E.164 format, e.g. +919876543210');

const printType = z.enum(['print', 'embroidery']);
const pricingMode = z.enum(['INSTANT', 'WHATSAPP_CONFIRMED']);

// Allowed upload content types (design uploads).
export const ALLOWED_UPLOAD_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export const createCustomOrderSchema = z.object({
  baseType: z.string().trim().min(1),
  size: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  color: z.string().trim().min(1).optional(),
  printPlacement: z.string().trim().min(1).optional(),
  printType: printType.optional(),
  designDescription: z.string().trim().max(2000).optional(),
  deliveryDeadline: z.coerce.date().optional(),
  contactName: z.string().trim().min(1).max(80),
  contactMobile: mobileNumber,
  // TODO: confirm with client — default WHATSAPP_CONFIRMED (Decision #1).
  pricingMode: pricingMode.default('WHATSAPP_CONFIRMED'),
});

// Update: same fields, all optional; status/pricing transitions handled by service.
export const updateCustomOrderSchema = z
  .object({
    baseType: z.string().trim().min(1).optional(),
    size: z.string().trim().min(1).optional(),
    quantity: z.coerce.number().int().min(1).optional(),
    color: z.string().trim().min(1).optional(),
    printPlacement: z.string().trim().min(1).optional(),
    printType: printType.optional(),
    designDescription: z.string().trim().max(2000).optional(),
    deliveryDeadline: z.coerce.date().optional(),
    contactName: z.string().trim().min(1).max(80).optional(),
    contactMobile: mobileNumber.optional(),
    pricingMode: pricingMode.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

// Max design-file size (25MB covers print-quality PNG/PDF artwork).
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const uploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_UPLOAD_TYPES),
  // Declared byte size. Optional for backward compatibility; when provided it is
  // signed into the upload URL (S3 Content-Length), making the cap enforceable.
  fileSize: z.coerce.number().int().min(1).max(MAX_UPLOAD_BYTES).optional(),
});

// Attach a previously-uploaded design. Prefer the server-issued storage KEY
// (returned by /upload-url) — the server reconstructs the canonical URL. A raw
// URL is still accepted for backward compatibility but is rejected unless it
// belongs to our own storage origin (CWE-20 / untrusted-URL fix).
export const attachFileSchema = z
  .object({
    uploadedFileKey: z.string().trim().min(1).max(300).optional(),
    uploadedFileUrl: z.string().trim().url().max(600).optional(),
  })
  .refine((v) => !!v.uploadedFileKey || !!v.uploadedFileUrl, {
    message: 'Provide uploadedFileKey (preferred) or uploadedFileUrl',
  });

export const customOrderIdSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type CreateCustomOrderInput = z.infer<typeof createCustomOrderSchema>;
export type UpdateCustomOrderInput = z.infer<typeof updateCustomOrderSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type AttachFileInput = z.infer<typeof attachFileSchema>;
