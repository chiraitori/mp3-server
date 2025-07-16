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

export default function AdminPage() {
  const [torrentInfo, setTorrentInfo] = useState<TorrentInfo | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    }
  }, [router])

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

        {/* Torrent Upload Section */}
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
        {torrentInfo && (
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
      </div>
    </div>
  )
}
