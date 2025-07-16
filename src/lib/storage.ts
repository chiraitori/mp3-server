import { Upload } from '@aws-sdk/lib-storage'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { promises as fs } from 'fs'
import path from 'path'

export async function uploadToR2(filePath: string, key: string): Promise<string> {
  const fileStream = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  
  // Set appropriate content type for audio files
  let contentType = 'application/octet-stream'
  switch (ext) {
    case '.mp3':
      contentType = 'audio/mpeg'
      break
    case '.flac':
      contentType = 'audio/flac'
      break
    case '.wav':
      contentType = 'audio/wav'
      break
    case '.ogg':
      contentType = 'audio/ogg'
      break
    case '.aac':
      contentType = 'audio/aac'
      break
    case '.m4a':
      contentType = 'audio/mp4'
      break
  }
  
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year
    },
  })
  
  await upload.done()
  return key
}

export async function getR2FileUrl(key: string): Promise<string> {
  // Use CDN domain for public access if available, otherwise use direct R2 URL
  const cdnDomain = process.env.R2_CDN_DOMAIN
  if (cdnDomain) {
    return `${cdnDomain}/${key}`
  }
  
  // Fallback to direct R2 public URL
  return `https://${R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
}

export async function createTempDirectory(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp')
  await fs.mkdir(tempDir, { recursive: true })
  return tempDir
}

export async function cleanupTempFiles(directory: string): Promise<void> {
  try {
    await fs.rm(directory, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}

export async function getTempDirectorySize(directory: string): Promise<number> {
  try {
    const stats = await fs.stat(directory)
    if (stats.isDirectory()) {
      const files = await fs.readdir(directory)
      let totalSize = 0
      
      for (const file of files) {
        const filePath = path.join(directory, file)
        const fileStats = await fs.stat(filePath)
        totalSize += fileStats.size
      }
      
      return totalSize
    }
    return stats.size
  } catch {
    return 0
  }
}
