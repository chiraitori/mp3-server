import { NextRequest, NextResponse } from 'next/server'
import { startFtpServer, stopFtpServer, getFtpServer } from '@/lib/ftpServer'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const token = authHeader.substring(7)
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const ftpServer = getFtpServer()
    
    return NextResponse.json({ 
      running: ftpServer !== null,
      port: process.env.FTP_PORT || 21,
      host: process.env.FTP_HOST || '0.0.0.0',
      username: process.env.FTP_USERNAME || 'admin',
      connectionUrl: `ftp://${process.env.FTP_USERNAME || 'admin'}:${process.env.FTP_PASSWORD || 'password'}@${process.env.FTP_HOST || 'localhost'}:${process.env.FTP_PORT || 21}/`
    })
  } catch (error) {
    console.error('Error checking FTP server status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const token = authHeader.substring(7)
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { action } = await request.json()

    if (action === 'start') {
      await startFtpServer({
        port: parseInt(process.env.FTP_PORT || '21'),
        host: process.env.FTP_HOST || '0.0.0.0',
        username: process.env.FTP_USERNAME || 'admin',
        password: process.env.FTP_PASSWORD || 'password'
      })

      return NextResponse.json({ 
        message: 'FTP server started successfully',
        port: process.env.FTP_PORT || 21,
        host: process.env.FTP_HOST || '0.0.0.0',
        username: process.env.FTP_USERNAME || 'admin',
        connectionUrl: `ftp://${process.env.FTP_USERNAME || 'admin'}:${process.env.FTP_PASSWORD || 'password'}@${process.env.FTP_HOST || 'localhost'}:${process.env.FTP_PORT || 21}/`
      })
    } else if (action === 'stop') {
      await stopFtpServer()
      return NextResponse.json({ message: 'FTP server stopped successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error controlling FTP server:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
