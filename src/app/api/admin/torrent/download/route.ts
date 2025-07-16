import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { uploadToR2, createTempDirectory, cleanupTempFiles, getTempDirectorySize } from '@/lib/storage'
import { promises as fs } from 'fs'
import path from 'path'
import torrentStream from 'torrent-stream'

interface DownloadRequest {
  torrentHash: string
  magnetLink: string
  selectedFiles: string[]
}

async function handleDownload(req: NextRequest) {
  try {
    const { torrentHash, magnetLink, selectedFiles }: DownloadRequest = await req.json()
    
    if (!torrentHash || !magnetLink || !selectedFiles.length) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Check temp storage space
    const tempDir = await createTempDirectory()
    const currentSize = await getTempDirectorySize(tempDir)
    const maxSize = parseInt(process.env.MAX_TEMP_STORAGE_MB || '1024') * 1024 * 1024 // Convert MB to bytes
    
    if (currentSize > maxSize * 0.8) { // Use 80% threshold
      return NextResponse.json({ error: 'Temp storage space low. Please try again later.' }, { status: 507 })
    }
    
    // Create download directory for this torrent
    const downloadDir = path.join(tempDir, torrentHash)
    await fs.mkdir(downloadDir, { recursive: true })
    
    // Download files using torrent-stream
    const downloadedFiles: string[] = []
    
    try {
      console.log('Starting torrent download for hash:', torrentHash)
      console.log('Magnet link:', magnetLink)
      console.log('Selected files:', selectedFiles)
      
      // Create torrent engine
      const engine = torrentStream(magnetLink, {
        tmp: downloadDir,
        path: downloadDir
      })
      
      await new Promise<void>((resolve, reject) => {
        let filesDownloaded = 0
        const totalFiles = selectedFiles.length
        
        engine.on('ready', () => {
          console.log('Torrent ready, files available:', engine.files.length)
          
          // Find and download only selected files
          for (const selectedFile of selectedFiles) {
            const file = engine.files.find(f => f.path === selectedFile || f.name === selectedFile)
            
            if (file) {
              console.log(`Downloading file: ${file.name} (${file.length} bytes)`)
              
              const localPath = path.join(downloadDir, file.name)
              const writeStream = require('fs').createWriteStream(localPath)
              
              file.createReadStream().pipe(writeStream)
              
              writeStream.on('finish', async () => {
                try {
                  // Upload to R2
                  const r2Key = `audio/${torrentHash}/${file.name}`
                  await uploadToR2(localPath, r2Key)
                  downloadedFiles.push(r2Key)
                  console.log(`Successfully uploaded ${file.name} to R2`)
                  
                  filesDownloaded++
                  if (filesDownloaded === totalFiles) {
                    engine.destroy(() => {})
                    resolve()
                  }
                } catch (error) {
                  console.error(`Error uploading ${file.name}:`, error)
                  engine.destroy(() => {})
                  reject(error)
                }
              })
              
              writeStream.on('error', (error: any) => {
                console.error(`Error writing ${file.name}:`, error)
                engine.destroy(() => {})
                reject(error)
              })
            } else {
              console.warn(`File not found in torrent: ${selectedFile}`)
              filesDownloaded++
              if (filesDownloaded === totalFiles) {
                engine.destroy(() => {})
                resolve()
              }
            }
          }
          
          if (totalFiles === 0) {
            engine.destroy(() => {})
            resolve()
          }
        })
        
        engine.on('error', (error: any) => {
          console.error('Torrent engine error:', error)
          engine.destroy(() => {})
          reject(error)
        })
        
        // Timeout after 5 minutes
        setTimeout(() => {
          console.error('Torrent download timeout')
          engine.destroy(() => {})
          reject(new Error('Download timeout'))
        }, 5 * 60 * 1000)
      })
      
      // Clean up temp files
      await cleanupTempFiles(downloadDir)
      
      return NextResponse.json({
        success: true,
        message: `Successfully processed ${downloadedFiles.length} files`,
        files: downloadedFiles
      })
      
    } catch (error) {
      // Clean up on error
      await cleanupTempFiles(downloadDir)
      throw error
    }
    
  } catch (error) {
    console.error('Error downloading torrent files:', error)
    return NextResponse.json({ error: 'Failed to download torrent files' }, { status: 500 })
  }
}

export const POST = withAuth(handleDownload)
