import { S3Client } from '@aws-sdk/client-s3'

const endpoint = process.env.R2_ENDPOINT
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  console.warn('R2 configuration incomplete. Some features may not work.')
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: endpoint || 'https://example.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: accessKeyId || 'dummy',
    secretAccessKey: secretAccessKey || 'dummy',
  },
})

export const R2_BUCKET_NAME = bucketName || 'default'
