import type {
  CreateUploadArgs,
  PresignedUpload,
  PutObjectArgs,
  StorageProvider,
} from './storage-provider';

/**
 * Dev/test storage provider. Returns deterministic fake URLs so the upload flow
 * can be exercised end-to-end without live S3 credentials. The uploadUrl is not a
 * real endpoint — the frontend can no-op the PUT in dev.
 * TODO: confirm with client — configure S3/R2 credentials to switch to the real provider.
 */
const STUB_BASE = 'https://stub-storage.local';

export const stubStorageProvider: StorageProvider = {
  name: 'stub',
  async createUploadUrl(args: CreateUploadArgs): Promise<PresignedUpload> {
    return {
      uploadUrl: `${STUB_BASE}/upload/${args.key}?token=dev`,
      fileUrl: `${STUB_BASE}/files/${args.key}`,
      key: args.key,
      expiresInSeconds: args.expiresInSeconds,
    };
  },

  async putObject(args: PutObjectArgs): Promise<{ fileUrl: string }> {
    // No real storage in dev/test — return a deterministic fake URL.
    return { fileUrl: `${STUB_BASE}/files/${args.key}` };
  },

  publicUrl(key: string): string {
    return `${STUB_BASE}/files/${key}`;
  },

  ownsUrl(url: string): boolean {
    return url.startsWith(`${STUB_BASE}/files/`);
  },
};
