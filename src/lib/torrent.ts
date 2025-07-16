import parseTorrent from 'parse-torrent'
import bencode from 'bencode'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export interface TorrentFile {
  name: string
  length: number
  path: string[]
  offset: number
}

export interface TorrentInfo {
  name: string
  files: TorrentFile[]
  totalSize: number
  infoHash: string
  announce: string[]
  magnetURI: string
}

export async function parseTorrentFile(filePath: string): Promise<TorrentInfo> {
  const torrentBuffer = await fs.readFile(filePath)
  
  console.log('Starting torrent parsing for:', path.basename(filePath))
  console.log('Buffer size:', torrentBuffer.length)
  
  // Try multiple parsing approaches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let torrentData: any = null
  let parseMethod = ''
  
  // Method 1: parse-torrent
  try {
    torrentData = parseTorrent(torrentBuffer)
    parseMethod = 'parse-torrent'
    console.log('parse-torrent result:', {
      name: torrentData?.name,
      files: torrentData?.files?.length,
      length: torrentData?.length,
      infoHash: torrentData?.infoHash
    })
  } catch (error) {
    console.log('parse-torrent failed:', error)
  }
  
  // Method 2: Manual bencode parsing if parse-torrent failed or returned incomplete data
  if (!torrentData || !torrentData.name || (!torrentData.files && !torrentData.length)) {
    try {
      console.log('Trying manual bencode parsing...')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = bencode.decode(torrentBuffer) as any
      
      const info = decoded.info
      if (!info) {
        throw new Error('No info section found in torrent')
      }
      
      // Calculate info hash
      const infoBuffer = bencode.encode(info)
      const infoHash = createHash('sha1').update(infoBuffer).digest('hex')
      
      // Extract name (handle Buffer objects properly)
      let name = 'Unknown'
      if (info.name) {
        if (Buffer.isBuffer(info.name)) {
          name = info.name.toString('utf8')
        } else if (info.name instanceof Uint8Array) {
          name = Buffer.from(info.name).toString('utf8')
        } else if (typeof info.name === 'string') {
          name = info.name
        } else if (info.name.toString) {
          name = info.name.toString()
        }
      }
      name = name.trim()
      
      // Extract announce URLs
      const announce: string[] = []
      if (decoded.announce) {
        const announceUrl = Buffer.isBuffer(decoded.announce) 
          ? decoded.announce.toString('utf8') 
          : decoded.announce.toString()
        announce.push(announceUrl)
      }
      if (decoded['announce-list'] && Array.isArray(decoded['announce-list'])) {
        for (const tier of decoded['announce-list']) {
          if (Array.isArray(tier)) {
            for (const url of tier) {
              const announceUrl = Buffer.isBuffer(url) 
                ? url.toString('utf8') 
                : url.toString()
              announce.push(announceUrl)
            }
          }
        }
      }
      
      // Create magnet URI
      const magnetURI = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`
      
      torrentData = {
        name,
        infoHash,
        announce,
        magnetURI,
        files: info.files,
        length: info.length
      }
      
      parseMethod = 'manual-bencode'
      console.log('Manual bencode result:', {
        name: torrentData.name,
        files: torrentData.files?.length,
        length: torrentData.length,
        infoHash: torrentData.infoHash
      })
      
      // Debug the files structure
      if (torrentData.files && Array.isArray(torrentData.files)) {
        console.log('Files found:', torrentData.files.length)
      }
    } catch (error) {
      console.error('Manual bencode parsing failed:', error)
      throw new Error(`Failed to parse torrent file: ${error}`)
    }
  }
  
  if (!torrentData) {
    throw new Error('Unable to parse torrent file with any method')
  }
  
  // Process file information
  let files: TorrentFile[] = []
  let totalSize = 0
  
  if (torrentData.files && Array.isArray(torrentData.files)) {
    // Multi-file torrent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files = torrentData.files.map((file: any, index: number) => {
      let fileName: string
      let filePath: string[]
      let fileSize: number
      
      if (parseMethod === 'manual-bencode') {
        // Handle bencode format (Buffers/Uint8Arrays)
        if (file.path && Array.isArray(file.path)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filePath = file.path.map((p: any) => {
            if (Buffer.isBuffer(p)) {
              return p.toString('utf8')
            } else if (p instanceof Uint8Array) {
              return Buffer.from(p).toString('utf8')
            }
            return p.toString?.() || p
          })
          fileName = filePath[filePath.length - 1] || `file_${index}`
        } else {
          fileName = `file_${index}`
          filePath = [fileName]
        }
        fileSize = file.length || 0
      } else {
        // Handle parse-torrent format
        fileName = file.name || file.path?.[file.path.length - 1] || `file_${index}`
        filePath = file.path || [fileName]
        fileSize = file.length || file.size || 0
      }
      
      return {
        name: fileName,
        length: fileSize,
        path: filePath,
        offset: file.offset || 0
      }
    })
    totalSize = files.reduce((sum, file) => sum + file.length, 0)
  } else if (torrentData.length) {
    // Single file torrent
    totalSize = torrentData.length
    files = [{
      name: torrentData.name,
      length: totalSize,
      path: [torrentData.name],
      offset: 0
    }]
  }
  
  const result: TorrentInfo = {
    name: torrentData.name,
    files,
    totalSize,
    infoHash: torrentData.infoHash,
    announce: torrentData.announce || [],
    magnetURI: torrentData.magnetURI || `magnet:?xt=urn:btih:${torrentData.infoHash}&dn=${encodeURIComponent(torrentData.name)}`
  }
  
  console.log('Final parsed torrent info:', {
    name: result.name,
    filesCount: result.files.length,
    totalSize: result.totalSize,
    infoHash: result.infoHash,
    method: parseMethod
  })
  
  return result
}

export function getAudioFiles(torrentInfo: TorrentInfo): TorrentFile[] {
  const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma']
  
  return torrentInfo.files.filter(file => {
    const ext = path.extname(file.name).toLowerCase()
    return audioExtensions.includes(ext)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
