import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { FTPClient, isAudioFile } from '@/lib/ftp'

async function handleFTPList(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const remotePath = searchParams.get('path') || process.env.FTP_REMOTE_PATH || '/'

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

    try {
      await ftpClient.connect()
      console.log('Connected to FTP server for listing')

      const allFiles = await ftpClient.listFiles(remotePath)
      const audioFiles = allFiles.filter(file => isAudioFile(file.name))

      return NextResponse.json({
        success: true,
        path: remotePath,
        files: audioFiles,
        totalFiles: allFiles.length,
        audioFiles: audioFiles.length
      })

    } finally {
      ftpClient.disconnect()
    }

  } catch (error) {
    console.error('Error listing FTP files:', error)
    return NextResponse.json({ error: 'Failed to list FTP files' }, { status: 500 })
  }
}

export const GET = withAuth(handleFTPList)
