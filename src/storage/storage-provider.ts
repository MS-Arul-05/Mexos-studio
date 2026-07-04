/**
 * Pluggable object-storage provider for direct-to-storage uploads
 * (02_ARCHITECTURE.md §4.2 — frontend uploads to a pre-signed URL, files never
 * route through the API). Default is a stub for dev/tests; a real S3 provider is
 * used when S3 credentials are configured.
 */
export interface PresignedUpload {
  /** URL the client PUTs the file to (short-lived). */
  uploadUrl: string;
  /** Public/canonical URL of the object once uploaded (stored on the record). */
  fileUrl: string;
  /** Object key within the bucket. */
  key: string;
  /** Seconds until the upload URL expires. */
  expiresInSeconds: number;
}

export interface CreateUploadArgs {
  key: string;
  contentType: string;
  expiresInSeconds: number;
  /**
   * Exact byte size the client declared. When set, providers include it in the
   * signature (S3 signs Content-Length), so the storage service rejects a body
   * of any other size — enforcing the API-side size cap end-to-end.
   */
  contentLength?: number;
}

export interface PutObjectArgs {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  readonly name: string;
  createUploadUrl(args: CreateUploadArgs): Promise<PresignedUpload>;
  /** Server-side upload (e.g. generated invoice PDF). Returns the object's URL. */
  putObject(args: PutObjectArgs): Promise<{ fileUrl: string }>;
  /** Canonical public URL for an object key (server reconstructs — never trusts client URLs). */
  publicUrl(key: string): string;
  /** True only if the URL points at THIS provider's storage (rejects third-party URLs). */
  ownsUrl(url: string): boolean;
}
