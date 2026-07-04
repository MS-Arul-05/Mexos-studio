import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { StorageProvider } from './storage-provider';
import { stubStorageProvider } from './stub-storage-provider';
import { createS3StorageProvider } from './s3-storage-provider';

/**
 * Storage provider factory. Uses the real S3 provider only when all required
 * credentials are configured; otherwise falls back to the stub (dev/test).
 */
function resolveProvider(): StorageProvider {
  const hasS3Creds = !!env.S3_BUCKET && !!env.S3_ACCESS_KEY && !!env.S3_SECRET_KEY;

  if (hasS3Creds) {
    return createS3StorageProvider();
  }

  logger.warn('S3 credentials not set — using stub storage provider (dev/test only).');
  return stubStorageProvider;
}

export const storageProvider: StorageProvider = resolveProvider();
export type { StorageProvider, PresignedUpload } from './storage-provider';
