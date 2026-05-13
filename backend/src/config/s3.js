const { S3Client } = require('@aws-sdk/client-s3');

const requiredVars = ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(`Missing required MinIO env vars: ${missing.join(', ')}`);
}

const internalEndpoint = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;

// Server-side client: used for PUT, HEAD, DELETE, GetObject from within the
// Docker network. Endpoint resolves to the internal service name.
const s3Client = new S3Client({
  endpoint: internalEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Presign-only client. Presigned URLs must encode the *browser-reachable*
// origin, not the internal hostname. Behind Nginx this is the /storage path on
// the public domain. Falls back to the internal endpoint for local dev.
const publicEndpoint = process.env.MINIO_PUBLIC_URL || internalEndpoint;
const s3PublicClient = new S3Client({
  endpoint: publicEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

const VIDEOS_BUCKET = process.env.MINIO_BUCKET_VIDEOS || 'clipsphere-videos';
const AVATARS_BUCKET = process.env.MINIO_BUCKET_AVATARS || 'clipsphere-avatars';

module.exports = { s3Client, s3PublicClient, VIDEOS_BUCKET, AVATARS_BUCKET };
