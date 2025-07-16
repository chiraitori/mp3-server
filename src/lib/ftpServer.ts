import { FtpSrv } from 'ftp-srv'
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME } from './r2'
import { Readable } from 'stream'
import path from 'path'

export class R2FtpServer {
  private ftpServer: FtpSrv
  private port: number
  private host: string
  private username: string
  private password: string

  constructor(config: {
    port: number
    host?: string
    username: string
    password: string
  }) {
    this.port = config.port
    this.host = config.host || '0.0.0.0'
    this.username = config.username
    this.password = config.password

    this.ftpServer = new FtpSrv({
      url: `ftp://${this.host}:${this.port}`,
      anonymous: false,
      pasv_url: this.host === '0.0.0.0' ? 'localhost' : this.host,
      pasv_min: 21000,
      pasv_max: 21100,
      greeting: 'Welcome to R2 FTP Server for foobar2000',
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
      console.log(`FTP login attempt: ${username}`)
      
      if (username === this.username && password === this.password) {
        console.log('FTP login successful')
        
        // Override file system methods using any type to bypass TypeScript checks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = connection as any
        
        conn.fs.list = async (dirPath: string) => {
          console.log(`FTP: Listing directory ${dirPath}`)
          return this.listR2Files(dirPath)
        }
        
        conn.fs.get = async (fileName: string) => {
          console.log(`FTP: Getting file ${fileName}`)
          return this.getR2FileStream(fileName)
        }
        
        resolve({ root: '/' })
      } else {
        console.log('FTP login failed')
        reject(new Error('Invalid credentials'))
      }
    })

    this.ftpServer.on('client-error', ({ error }) => {
      console.error('FTP client error:', error)
    })
  }

  private async listR2Files(dirPath: string): Promise<Record<string, unknown>[]> {
    try {
      // Remove leading slash
      const prefix = dirPath.startsWith('/') ? dirPath.slice(1) : dirPath
      
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        Delimiter: '/',
      })

      const response = await r2Client.send(command)
      const items: Record<string, unknown>[] = []

      // Add directories
      if (response.CommonPrefixes) {
        for (const commonPrefix of response.CommonPrefixes) {
          if (commonPrefix.Prefix) {
            const name = commonPrefix.Prefix.replace(/\/$/, '').split('/').pop() || ''
            items.push({
              name,
              date: new Date(),
              size: 0,
              type: 'directory',
              mode: 0o755,
              uid: 0,
              gid: 0,
              isDirectory: () => true,
              isFile: () => false,
              path: '/' + commonPrefix.Prefix
            })
          }
        }
      }

      // Add files (only audio files)
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Key !== prefix) {
            const name = obj.Key.split('/').pop() || ''
            if (this.isAudioFile(name)) {
              items.push({
                name,
                date: obj.LastModified || new Date(),
                size: obj.Size || 0,
                type: 'file',
                mode: 0o644,
                uid: 0,
                gid: 0,
                isDirectory: () => false,
                isFile: () => true,
                path: '/' + obj.Key
              })
            }
          }
        }
      }

      return items
    } catch (error) {
      console.error(`Error listing directory ${dirPath}:`, error)
      return []
    }
  }

  private async getR2FileStream(fileName: string): Promise<Readable> {
    try {
      // Remove leading slash
      const key = fileName.startsWith('/') ? fileName.slice(1) : fileName
      
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })

      const response = await r2Client.send(command)
      
      if (!response.Body) {
        throw new Error('File not found')
      }

      return response.Body as Readable
    } catch (error) {
      console.error(`Error getting file ${fileName}:`, error)
      throw error
    }
  }

  private isAudioFile(filename: string): boolean {
    const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma']
    const ext = path.extname(filename).toLowerCase()
    return audioExtensions.includes(ext)
  }

  async start(): Promise<void> {
    try {
      await this.ftpServer.listen()
      console.log(`FTP server started on ${this.host}:${this.port}`)
      console.log(`foobar2000 connection: ftp://${this.username}:${this.password}@${this.host}:${this.port}/`)
    } catch (error) {
      console.error('Failed to start FTP server:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    try {
      await this.ftpServer.close()
      console.log('FTP server stopped')
    } catch (error) {
      console.error('Error stopping FTP server:', error)
    }
  }
}

// Global FTP server instance
let ftpServerInstance: R2FtpServer | null = null

export async function startFtpServer(config: {
  port: number
  host?: string
  username: string
  password: string
}): Promise<R2FtpServer> {
  if (ftpServerInstance) {
    console.log('FTP server already running')
    return ftpServerInstance
  }

  ftpServerInstance = new R2FtpServer(config)
  await ftpServerInstance.start()
  return ftpServerInstance
}

export async function stopFtpServer(): Promise<void> {
  if (ftpServerInstance) {
    await ftpServerInstance.stop()
    ftpServerInstance = null
  }
}

export function getFtpServer(): R2FtpServer | null {
  return ftpServerInstance
}
