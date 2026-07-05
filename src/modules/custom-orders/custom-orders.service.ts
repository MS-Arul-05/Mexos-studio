import { randomUUID } from 'node:crypto';
import type { CustomOrder, Prisma } from '@prisma/client';
import { customOrdersRepository } from './custom-orders.repository';
import { computeInstantPrice } from './pricing';
import { storageProvider, type PresignedUpload } from '../../storage';
import { virusScanProvider } from '../../storage/virus-scan';
import { AppError } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { decimalToString } from '../../utils/serialize';
import type {
  CreateCustomOrderInput,
  UpdateCustomOrderInput,
  UploadUrlInput,
} from './custom-orders.schemas';

const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export interface Requester {
  userId?: string;
  /** Verified guest custom order ID from a signed capability token. */
  guestCustomOrderId?: string;
}

export function serializeCustomOrder(o: CustomOrder) {
  return {
    id: o.id,
    userId: o.userId,
    baseType: o.baseType,
    size: o.size,
    quantity: o.quantity,
    color: o.color,
    printPlacement: o.printPlacement,
    printType: o.printType,
    designDescription: o.designDescription,
    uploadedFileUrl: o.uploadedFileUrl,
    deliveryDeadline: o.deliveryDeadline,
    contactName: o.contactName,
    contactMobile: o.contactMobile,
    pricingMode: o.pricingMode,
    quotedPrice: decimalToString(o.quotedPrice),
    status: o.status,
    orderId: o.orderId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export type SerializedCustomOrder = ReturnType<typeof serializeCustomOrder>;

/** Load an order or 404. */
async function getOrThrow(id: string): Promise<CustomOrder> {
  const order = await customOrdersRepository.findById(id);
  if (!order) throw AppError.notFound('Custom order not found', 'CUSTOM_ORDER_NOT_FOUND');
  return order;
}

/**
 * Ownership check: user-owned orders require the same authenticated user; guest
 * orders (userId null) require possession of a signed capability token.
 */
function assertOwnership(order: CustomOrder, requester: Requester): void {
  if (order.userId) {
    // User-owned: must be the same authenticated user.
    if (order.userId !== requester.userId) {
      throw AppError.forbidden('You do not have access to this custom order');
    }
  } else {
    // Guest order: require a valid signed token scoped to this order ID.
    if (requester.guestCustomOrderId !== order.id) {
      throw AppError.notFound('Custom order not found', 'CUSTOM_ORDER_NOT_FOUND');
    }
  }
}

/** Only DRAFT orders can be edited/uploaded/attached. */
function assertEditable(order: CustomOrder): void {
  if (order.status !== 'DRAFT') {
    throw AppError.conflict(
      `Custom order can no longer be edited (status: ${order.status})`,
      'CUSTOM_ORDER_NOT_EDITABLE',
    );
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

export const customOrdersService = {
  async create(
    input: CreateCustomOrderInput,
    requester: Requester,
  ): Promise<SerializedCustomOrder> {
    const data: Prisma.CustomOrderCreateInput = {
      baseType: input.baseType,
      size: input.size,
      quantity: input.quantity,
      color: input.color ?? null,
      printPlacement: input.printPlacement ?? null,
      printType: input.printType ?? null,
      designDescription: input.designDescription ?? null,
      deliveryDeadline: input.deliveryDeadline ?? null,
      contactName: input.contactName,
      contactMobile: input.contactMobile,
      pricingMode: input.pricingMode,
      status: 'DRAFT',
      ...(requester.userId ? { user: { connect: { id: requester.userId } } } : {}),
    };
    const created = await customOrdersRepository.create(data);
    return serializeCustomOrder(created);
  },

  async getById(id: string, requester: Requester): Promise<SerializedCustomOrder> {
    const order = await getOrThrow(id);
    assertOwnership(order, requester);
    return serializeCustomOrder(order);
  },

  async update(
    id: string,
    input: UpdateCustomOrderInput,
    requester: Requester,
  ): Promise<SerializedCustomOrder> {
    const order = await getOrThrow(id);
    assertOwnership(order, requester);
    assertEditable(order);

    const updated = await customOrdersRepository.update(id, {
      ...input,
      // Coerced/normalized optional nulls stay undefined so Prisma leaves them untouched.
    });
    return serializeCustomOrder(updated);
  },

  async createUploadUrl(
    id: string,
    input: UploadUrlInput,
    requester: Requester,
  ): Promise<PresignedUpload> {
    const order = await getOrThrow(id);
    assertOwnership(order, requester);
    assertEditable(order);

    const key = `custom-orders/${id}/${randomUUID()}-${sanitizeFileName(input.fileName)}`;
    return storageProvider.createUploadUrl({
      key,
      contentType: input.contentType,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
      contentLength: input.fileSize,
    });
  },

  /**
   * Attach a design file to a draft. The stored URL is ALWAYS derived from a
   * trusted source: either a server-issued key scoped to this order (preferred,
   * server reconstructs the URL) or a raw URL that must belong to our storage
   * origin. Arbitrary third-party URLs are rejected (CWE-20).
   */
  async attachFile(
    id: string,
    input: { uploadedFileKey?: string; uploadedFileUrl?: string },
    requester: Requester,
  ): Promise<SerializedCustomOrder> {
    const order = await getOrThrow(id);
    assertOwnership(order, requester);
    assertEditable(order);

    let fileUrl: string;
    if (input.uploadedFileKey) {
      // Key must be scoped to THIS order's prefix — prevents attaching another
      // order's (or an arbitrary) object.
      const prefix = `custom-orders/${id}/`;
      if (!input.uploadedFileKey.startsWith(prefix)) {
        throw AppError.badRequest('File key does not belong to this order', 'FILE_KEY_INVALID');
      }
      fileUrl = storageProvider.publicUrl(input.uploadedFileKey);
    } else {
      const url = input.uploadedFileUrl as string;
      if (!storageProvider.ownsUrl(url)) {
        throw AppError.badRequest(
          'File URL must originate from our storage',
          'FILE_URL_NOT_ALLOWED',
        );
      }
      fileUrl = url;
    }

    // Malware scan hook — fail-closed: not-clean OR scanner error rejects the file.
    const scan = await virusScanProvider
      .scan({ key: input.uploadedFileKey, url: fileUrl })
      .catch((err) => {
        logger.error({ err, customOrderId: id }, 'Virus scan errored — rejecting upload');
        return { clean: false, reason: 'scan unavailable' };
      });
    if (!scan.clean) {
      throw AppError.badRequest('Uploaded file was rejected by malware scanning', 'FILE_REJECTED');
    }

    const updated = await customOrdersRepository.updateIfDraft(id, { uploadedFileUrl: fileUrl });
    if (!updated) {
      throw AppError.conflict(
        'Custom order can no longer be edited (status changed concurrently)',
        'CUSTOM_ORDER_NOT_EDITABLE',
      );
    }
    return serializeCustomOrder(updated);
  },

  /**
   * Submit a draft (Epic 4.1 precursor). WHATSAPP_CONFIRMED → SUBMITTED (human
   * quotes later). INSTANT → compute price and move to QUOTED.
   */
  async submit(id: string, requester: Requester): Promise<SerializedCustomOrder> {
    const order = await getOrThrow(id);
    assertOwnership(order, requester);
    if (order.status !== 'DRAFT') {
      throw AppError.conflict(
        `Only draft custom orders can be submitted (status: ${order.status})`,
        'CUSTOM_ORDER_NOT_SUBMITTABLE',
      );
    }

    const data: Prisma.CustomOrderUpdateInput =
      order.pricingMode === 'INSTANT'
        ? {
            status: 'QUOTED',
            quotedPrice: computeInstantPrice({
              baseType: order.baseType,
              quantity: order.quantity,
              printType: order.printType,
            }),
          }
        : { status: 'SUBMITTED' };

    const updated = await customOrdersRepository.update(id, data);
    return serializeCustomOrder(updated);
  },
};
