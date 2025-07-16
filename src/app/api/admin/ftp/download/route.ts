import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { FTPClient, isAudioFile } from '@/lib/ftp'
import { uploadToR2, createTempDirectory, cleanupTempFiles } from '@/lib/storage'
import path from 'path'

interface FTPDownloadRequest {
  files: string[]
}

async function handleFTPDownload(req: NextRequest) {
  try {
    const { files }: FTPDownloadRequest = await req.json()
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files selected' }, { status: 400 })
    }

    // Check if FTP is configured
    const ftpHost = process.env.FTP_HOST
    const ftpUser = process.env.FTP_USER
    const ftpPassword = process.env.FTP_PASSWORD

    if (!ftpHost || !ftpUser || !ftpPassword) {
      return NextResponse.json({ error: 'FTP not configured' }, { status: 400 })
    }

    const ftpConfig = {
      host: ftpHost,
      port: parseInt(process.env.FTP_PORT || '21'),
      user: ftpUser,
      password: ftpPassword,
      secure: process.env.FTP_SECURE === 'true'
    }

    const ftpClient = new FTPClient(ftpConfig)
    const tempDir = await createTempDirectory()
    const downloadedFiles: string[] = []

    try {
      await ftpClient.connect()
      console.log('Connected to FTP server')

      for (const filePath of files) {
        if (!isAudioFile(filePath)) {
          console.warn(`Skipping non-audio file: ${filePath}`)
          continue
        }

        const fileName = path.basename(filePath)
        const localPath = path.join(tempDir, fileName)

        console.log(`Downloading: ${filePath}`)
        await ftpClient.downloadFile(filePath, localPath)

        // Upload to R2
        const r2Key = `audio/ftp/${fileName}`
        await uploadToR2(localPath, r2Key)
        downloadedFiles.push(r2Key)
        console.log(`Uploaded to R2: ${r2Key}`)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully downloaded ${downloadedFiles.length} files`,
        files: downloadedFiles
      })

    } finally {
      ftpClient.disconnect()
      await cleanupTempFiles(tempDir)
    }

  } catch (error) {
    console.error('Error downloading FTP files:', error)
    return NextResponse.json({ error: 'Failed to download FTP files' }, { status: 500 })
  }
}

export const POST = withAuth(handleFTPDownload)
