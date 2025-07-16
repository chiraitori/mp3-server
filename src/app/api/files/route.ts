import { NextRequest, NextResponse } from 'next/server'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get('prefix') || 'audio/'
    
    // Check if R2 is properly configured
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ 
        error: 'R2 storage not configured',
        files: [] 
      }, { status: 200 })
    }
    
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
    })
    
    const response = await r2Client.send(command)
    
    if (!response.Contents) {
      return NextResponse.json({ files: [] })
    }
    
    const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma']
    
    const audioFiles = response.Contents
      .filter(obj => {
        const ext = obj.Key?.toLowerCase().split('.').pop()
        return ext && audioExtensions.includes(`.${ext}`)
      })
      .map(obj => {
        const key = obj.Key!
        const name = key.split('/').pop() || key
        
        return {
          key,
          name,
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString(),
          url: process.env.R2_CDN_DOMAIN ? `${process.env.R2_CDN_DOMAIN}/${key}` : `/api/stream?key=${key}`
        }
      })
    
    return NextResponse.json({ files: audioFiles })
    
  } catch (error) {
    console.error('Error listing audio files:', error)
    return NextResponse.json({ 
      error: 'Failed to list audio files',
      files: [],
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }) // Return 200 to avoid HTML error pages
  }
}
