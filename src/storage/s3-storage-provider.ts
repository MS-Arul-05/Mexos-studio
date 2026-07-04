import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import type {
  CreateUploadArgs,
  PresignedUpload,
  PutObjectArgs,
  StorageProvider,
} from './storage-provider';

/**
 * Real S3-compatible provider (AWS S3 / Cloudflare R2 / MinIO). Issues a pre-signed
 * PUT URL so the client uploads directly to storage. Only constructed when the
 * required S3 credentials are present (see factory in ./index.ts).
 */
export function createS3StorageProvider(): StorageProvider {
  const bucket = env.S3_BUCKET!;
  const client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY!,
      secretAccessKey: env.S3_SECRET_KEY!,
    },
  });

  // Canonical object URL. For custom endpoints (R2/MinIO) use path-style; for AWS
  // use the regional virtual-hosted style.
  const publicUrl = (key: string): string =>
    env.S3_ENDPOINT
      ? `${env.S3_ENDPOINT.replace(/\/$/, '')}/${bucket}/${key}`
      : `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;

  // Prefix identifying objects that live in OUR bucket (used to reject third-party URLs).
  const ownedPrefix = publicUrl('');

  return {
    name: 's3',
    publicUrl,
    ownsUrl: (url: string): boolean => url.startsWith(ownedPrefix),
    async createUploadUrl(args: CreateUploadArgs): Promise<PresignedUpload> {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: args.key,
        ContentType: args.contentType,
        // Signed into the URL: the client must upload exactly this many bytes.
        ...(args.contentLength ? { ContentLength: args.contentLength } : {}),
      });
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: args.expiresInSeconds,
      });
      return {
        uploadUrl,
        fileUrl: publicUrl(args.key),
        key: args.key,
        expiresInSeconds: args.expiresInSeconds,
      };
    },

    async putObject(args: PutObjectArgs): Promise<{ fileUrl: string }> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: args.key,
          Body: args.body,
          ContentType: args.contentType,
        }),
      );
      return { fileUrl: publicUrl(args.key) };
    },
  };
}
