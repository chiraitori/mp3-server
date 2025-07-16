'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AudioFile {
  name: string
  size: number
  path: string
}

interface TorrentInfo {
  name: string
  totalSize: number
  infoHash: string
  audioFiles: AudioFile[]
}

interface FTPFile {
  name: string
  size: number
  type: string
  date: string
  path: string
}

interface FTPListResponse {
  success: boolean
  path: string
  files: FTPFile[]
  totalFiles: number
  audioFiles: number
  error?: string
}

export default function AdminPage() {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'torrent' | 'ftp' | 'ftpServer'>('torrent')
  const [ftpFiles, setFtpFiles] = useState<FTPFile[]>([])
  const [ftpLoading, setFtpLoading] = useState(false)
  const [selectedFtpFiles, setSelectedFtpFiles] = useState<string[]>([])
  const [ftpServerRunning, setFtpServerRunning] = useState(false)
  const [ftpServerInfo, setFtpServerInfo] = useState<{
    port: number
    host: string
    username: string
    connectionUrl: string
  } | null>(null)
  const [ftpServerLoading, setFtpServerLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      // Check FTP server status on page load
      checkFtpServerStatus()
    }
  }, [router])

  const checkFtpServerStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/ftp/server', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setFtpServerRunning(data.running)
        setFtpServerInfo({
          port: data.port,
          host: data.host,
          username: data.username,
          connectionUrl: data.connectionUrl
        })
      }
    } catch (error) {
      console.error('Error checking FTP server status:', error)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const file = formData.get('torrent') as File

    if (!file) {
      setError('Please select a torrent file')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/torrent/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setTorrentInfo(data.torrentInfo)
        setMessage('Torrent uploaded successfully!')
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelection = (filePath: string) => {
    setSelectedFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    )
  }

  const handleDownload = async () => {
    if (!torrentInfo || selectedFiles.length === 0) {
      setError('Please select files to download')
      return
    }

    setDownloading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/torrent/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          torrentHash: torrentInfo.infoHash,
          magnetLink: `magnet:?xt=urn:btih:${torrentInfo.infoHash}`,
          selectedFiles,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Successfully processed ${data.files.length} files`)
        setSelectedFiles([])
      } else {
        setError(data.error || 'Download failed')
      }
    } catch (error) {
      console.error('Download error:', error)
      setError('An error occurred during download')
    } finally {
      setDownloading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      localStorage.removeItem('admin_token')
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleFtpList = async () => {
    setFtpLoading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/ftp/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data: FTPListResponse = await response.json()

      if (response.ok) {
        setFtpFiles(data.files)
        setMessage(`Found ${data.audioFiles} audio files on FTP server`)
      } else {
        setError(data.error || 'Failed to list FTP files')
      }
    } catch (error) {
      console.error('FTP list error:', error)
      setError('An error occurred while listing FTP files')
    } finally {
      setFtpLoading(false)
    }
  }

  const handleFtpDownload = async () => {
    if (selectedFtpFiles.length === 0) {
      setError('Please select files to download')
      return
    }

    setDownloading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/ftp/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: selectedFtpFiles,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Successfully downloaded ${data.files.length} files`)
        setSelectedFtpFiles([])
      } else {
        setError(data.error || 'Download failed')
      }
    } catch (error) {
      console.error('FTP download error:', error)
      setError('An error occurred during FTP download')
    } finally {
      setDownloading(false)
    }
  }

  const handleFtpFileSelect = (filePath: string) => {
    setSelectedFtpFiles(prev => 
      prev.includes(filePath) 
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    )
  }

  const handleFtpServerToggle = async () => {
    setFtpServerLoading(true)
    setError('')
    setMessage('')

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/ftp/server', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: ftpServerRunning ? 'stop' : 'start',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setFtpServerRunning(!ftpServerRunning)
        if (data.connectionUrl) {
          setFtpServerInfo({
            port: data.port,
            host: data.host,
            username: data.username,
            connectionUrl: data.connectionUrl
          })
        }
      } else {
        setError(data.error || 'FTP server operation failed')
      }
    } catch (error) {
      console.error('FTP server operation error:', error)
      setError('An error occurred while controlling FTP server')
    } finally {
      setFtpServerLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Audio Streaming Admin Panel
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('torrent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'torrent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Torrent Upload
              </button>
              <button
                onClick={() => setActiveTab('ftp')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ftp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FTP Download
              </button>
              <button
                onClick={() => setActiveTab('ftpServer')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ftpServer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FTP Server
              </button>
            </nav>
          </div>
        </div>

        {/* Torrent Upload Section */}
        {activeTab === 'torrent' && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Torrent File</h2>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <input
                  type="file"
                  name="torrent"
                  accept=".torrent"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {uploading ? 'Uploading...' : 'Upload Torrent'}
              </button>
            </form>
          </div>
        )}

        {/* FTP Download Section */}
        {activeTab === 'ftp' && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">FTP File Browser</h2>
            <div className="space-y-4">
              <button
                onClick={handleFtpList}
                disabled={ftpLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {ftpLoading ? 'Loading...' : 'Browse FTP Server'}
              </button>
              
              {ftpFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Available Audio Files:</h3>
                  <div className="max-h-96 overflow-y-auto border rounded-md">
                    {ftpFiles.map((file, index) => (
                      <div key={index} className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`ftp-${index}`}
                          checked={selectedFtpFiles.includes(file.path)}
                          onChange={() => handleFtpFileSelect(file.path)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <label htmlFor={`ftp-${index}`} className="cursor-pointer">
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-gray-500">
                              {formatFileSize(file.size)} • {new Date(file.date).toLocaleDateString()}
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedFtpFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedFtpFiles.length} files selected
                      </p>
                      <button
                        onClick={handleFtpDownload}
                        disabled={downloading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {downloading ? 'Downloading...' : 'Download Selected Files'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Torrent Info and File Selection */}
        {activeTab === 'torrent' && torrentInfo && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Torrent: {torrentInfo.name}</h2>
              <p className="text-gray-600">Total Size: {formatFileSize(torrentInfo.totalSize)}</p>
              <p className="text-gray-600">Audio Files: {torrentInfo.audioFiles.length}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Select Audio Files to Download:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {torrentInfo.audioFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 border rounded-md">
                    <input
                      type="checkbox"
                      id={`file-${index}`}
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => handleFileSelection(file.path)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`file-${index}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {file.path}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedFiles.length} files selected
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading || selectedFiles.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {downloading ? 'Processing...' : 'Download Selected Files'}
              </button>
            </div>
          </div>
        )}

        {/* FTP Server Section */}
        {activeTab === 'ftpServer' && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">FTP Server for foobar2000</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ftpServerRunning 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ftpServerRunning ? 'Running' : 'Stopped'}
                </span>
                
                <button
                  onClick={handleFtpServerToggle}
                  disabled={ftpServerLoading}
                  className={`px-4 py-2 text-white rounded-md disabled:bg-gray-400 ${
                    ftpServerRunning 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {ftpServerLoading ? 'Loading...' : (ftpServerRunning ? 'Stop Server' : 'Start Server')}
                </button>
              </div>

              {ftpServerInfo && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Connection Information:</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Host:</strong> {ftpServerInfo.host}</p>
                    <p><strong>Port:</strong> {ftpServerInfo.port}</p>
                    <p><strong>Username:</strong> {ftpServerInfo.username}</p>
                    <p><strong>Connection URL:</strong> 
                      <code className="ml-2 bg-gray-200 px-2 py-1 rounded">
                        {ftpServerInfo.connectionUrl}
                      </code>
                    </p>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">foobar2000 Setup:</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Open foobar2000</li>
                      <li>2. Go to File → Open → Add location</li>
                      <li>3. Enter the FTP URL above</li>
                      <li>4. Browse and play your audio files directly from R2 storage</li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 p-4 rounded-md">
                <h4 className="font-medium text-yellow-900 mb-2">Note:</h4>
                <p className="text-sm text-yellow-800">
                  This FTP server streams audio files directly from R2 storage without downloading them locally. 
                  Perfect for foobar2000 and other audio players that support FTP streaming.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
