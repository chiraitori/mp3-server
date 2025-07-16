import { NextRequest, NextResponse } from 'next/server'
import { parseTorrentFile, getAudioFiles } from '@/lib/torrent'
import { createTempDirectory } from '@/lib/storage'
import { withAuth } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

async function handleUpload(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('torrent') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No torrent file uploaded' }, { status: 400 })
    }
    
    if (!file.name.endsWith('.torrent')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a .torrent file' }, { status: 400 })
    }
    
    console.log('Uploading torrent file:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    // Create temp directory
    const tempDir = await createTempDirectory()
    const tempFilePath = path.join(tempDir, file.name)
    
    // Save uploaded file
    const bytes = await file.arrayBuffer()
    await fs.writeFile(tempFilePath, Buffer.from(bytes))
    
    console.log('Torrent file saved to:', tempFilePath)
    
    // Parse torrent
    const torrentInfo = await parseTorrentFile(tempFilePath)
    const audioFiles = getAudioFiles(torrentInfo)
    
    console.log('Parsed torrent info:', {
      name: torrentInfo.name,
      totalSize: torrentInfo.totalSize,
      totalFiles: torrentInfo.files.length,
      audioFiles: audioFiles.length
    })
    
    // Clean up temp file
    await fs.unlink(tempFilePath)
    
    return NextResponse.json({
      success: true,
      torrentInfo: {
        name: torrentInfo.name,
        totalSize: torrentInfo.totalSize,
        infoHash: torrentInfo.infoHash,
        audioFiles: audioFiles.map(file => ({
          name: file.name,
          size: file.length,
          path: file.path.join('/')
        }))
      }
    })
  } catch (error) {
    console.error('Error processing torrent:', error)
    return NextResponse.json({ 
      error: 'Failed to process torrent file', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const POST = withAuth(handleUpload)
