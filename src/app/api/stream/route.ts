import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json({ error: 'File key is required' }, { status: 400 })
    }

    // If CDN domain is configured, redirect to CDN for better performance
    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (cdnDomain) {
      const cdnUrl = `${cdnDomain}/${key}`
      return NextResponse.redirect(cdnUrl)
    }
    
    // Fallback to direct R2 streaming
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
    
    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    
    // Stream the file
    const stream = response.Body as ReadableStream
    
    // Determine content type based on file extension
    const getContentType = (key: string): string => {
      const ext = key.toLowerCase().split('.').pop()
      switch (ext) {
        case 'flac':
          return 'audio/flac'
        case 'mp3':
          return 'audio/mpeg'
        case 'wav':
          return 'audio/wav'
        case 'ogg':
          return 'audio/ogg'
        case 'aac':
          return 'audio/aac'
        case 'm4a':
          return 'audio/mp4'
        default:
          return response.ContentType || 'audio/mpeg'
      }
    }
    
    // Set appropriate headers for audio streaming
    const headers = new Headers({
      'Content-Type': getContentType(key),
      'Content-Length': response.ContentLength?.toString() || '0',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Content-Disposition': 'inline', // Important for browser playback
      'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    })
    
    // Handle range requests for seeking
    const range = req.headers.get('range')
    if (range && response.ContentLength) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : response.ContentLength - 1
      
      headers.set('Content-Range', `bytes ${start}-${end}/${response.ContentLength}`)
      headers.set('Content-Length', (end - start + 1).toString())
      
      return new NextResponse(stream, {
        status: 206,
        headers,
      })
    }
    
    return new NextResponse(stream, {
      status: 200,
      headers,
    })
    
  } catch (error) {
    console.error('Error streaming audio:', error)
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    },
  })
}
