import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'm3u'
    
    // Get all audio files from the files API
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const filesResponse = await fetch(`${baseUrl}/api/files`)
    
    if (!filesResponse.ok) {
      throw new Error('Failed to fetch files')
    }
    
    const { files } = await filesResponse.json()
    const audioFiles = files.filter((file: any) => {
      const ext = file.key.toLowerCase().split('.').pop()
      return ['flac', 'mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext || '')
    })
    
    if (format === 'm3u') {
      // Generate M3U playlist for foobar2000/VLC
      let playlist = '#EXTM3U\n'
      playlist += '#PLAYLIST:Audio Stream Playlist\n\n'
      
      for (const file of audioFiles) {
        const streamUrl = `${baseUrl}/api/stream?key=${encodeURIComponent(file.key)}`
        const fileName = file.key.split('/').pop() || file.key
        const title = fileName.replace(/\.[^/.]+$/, '') // Remove extension
        
        playlist += `#EXTINF:-1,${title}\n`
        playlist += `${streamUrl}\n\n`
      }
      
      return new NextResponse(playlist, {
        headers: {
          'Content-Type': 'audio/x-mpegurl',
          'Content-Disposition': 'attachment; filename="playlist.m3u"',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
    // Default JSON format
    return NextResponse.json({
      files: audioFiles.map((file: any) => ({
        name: file.key.split('/').pop() || file.key,
        url: `${baseUrl}/api/stream?key=${encodeURIComponent(file.key)}`,
        key: file.key,
        size: file.size
      }))
    })
    
  } catch (error) {
    console.error('Error generating playlist:', error)
    return NextResponse.json({ error: 'Failed to generate playlist' }, { status: 500 })
  }
}
