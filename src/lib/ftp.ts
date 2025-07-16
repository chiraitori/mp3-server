import Client from 'ftp'
import { createWriteStream, createReadStream } from 'fs'
import path from 'path'

export interface FTPConfig {
  host: string
  port?: number
  user: string
  password: string
  secure?: boolean
}

export interface FTPFile {
  name: string
  size: number
  type: string
  date: Date
  path: string
}

export class FTPClient {
  private config: FTPConfig
  private client: Client

  constructor(config: FTPConfig) {
    this.config = config
    this.client = new Client()
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        console.log('FTP connection established')
        resolve()
      })

      this.client.on('error', (err: Error) => {
        console.error('FTP connection error:', err)
        reject(err)
      })

      this.client.connect({
        host: this.config.host,
        port: this.config.port || 21,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure || false
      })
    })
  }

  async listFiles(remotePath: string = '/'): Promise<FTPFile[]> {
    return new Promise((resolve, reject) => {
      this.client.list(remotePath, (err: Error | null, list: Client.ListingElement[]) => {
        if (err) {
          reject(err)
          return
        }

        const files: FTPFile[] = list
          .filter((item: Client.ListingElement) => item.type === '-') // Only files, not directories
          .map((item: Client.ListingElement) => ({
            name: item.name,
            size: item.size,
            type: this.getFileType(item.name),
            date: item.date,
            path: path.posix.join(remotePath, item.name)
          }))

        resolve(files)
      })
    })
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.get(remotePath, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err)
          return
        }

        const writeStream = createWriteStream(localPath)
        stream.pipe(writeStream)

        stream.on('end', () => {
          console.log(`Downloaded: ${remotePath} -> ${localPath}`)
          resolve()
        })

        stream.on('error', (err: Error) => {
          reject(err)
        })

        writeStream.on('error', (err: Error) => {
          reject(err)
        })
      })
    })
  }

  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(localPath)
      
      this.client.put(readStream, remotePath, (err: Error | null) => {
        if (err) {
          reject(err)
          return
        }

        console.log(`Uploaded: ${localPath} -> ${remotePath}`)
        resolve()
      })
    })
  }

  async deleteFile(remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.delete(remotePath, (err: Error | null) => {
        if (err) {
          reject(err)
          return
        }

        console.log(`Deleted: ${remotePath}`)
        resolve()
      })
    })
  }

  disconnect(): void {
    this.client.end()
  }

  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    switch (ext) {
      case '.mp3':
        return 'audio/mpeg'
      case '.flac':
        return 'audio/flac'
      case '.wav':
        return 'audio/wav'
      case '.ogg':
        return 'audio/ogg'
      case '.aac':
        return 'audio/aac'
      case '.m4a':
        return 'audio/mp4'
      default:
        return 'application/octet-stream'
    }
  }
}

export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma']
  const ext = path.extname(filename).toLowerCase()
  return audioExtensions.includes(ext)
}
