'use client'

import { useState, useEffect } from 'react'

interface AudioFile {
  key: string
  name: string
  size: number
  url: string
}

export default function Home() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchAudioFiles()
  }, [])

  const fetchAudioFiles = async () => {
    try {
      const response = await fetch('/api/files')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response')
      }
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setAudioFiles([])
      } else {
        setAudioFiles(data.files || [])
        setError('')
      }
    } catch (err) {
      console.error('Error fetching audio files:', err)
      setError(err instanceof Error ? err.message : 'Failed to load audio files')
      setAudioFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAudio = (fileKey: string) => {
    setCurrentlyPlaying(fileKey)
  }

  const handleStopAudio = () => {
    setCurrentlyPlaying(null)
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Stream URL copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy URL:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Stream URL copied to clipboard!')
    }
  }

  const openInVLC = (url: string) => {
    // VLC protocol handler
    const vlcUrl = `vlc://${url}`
    window.open(vlcUrl, '_blank')
    
    // Also provide instructions
    setTimeout(() => {
      alert(
        'Opening in VLC...\n\n' +
        'If VLC doesn\'t open automatically:\n' +
        '1. Open VLC Media Player\n' +
        '2. Go to Media → Open Network Stream\n' +
        '3. Paste this URL: ' + url
      )
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Audio Streaming Platform
          </h1>
          <p className="text-gray-600">
            High-quality audio streaming with FLAC support
          </p>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audio files...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error loading audio files
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchAudioFiles}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : audioFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No audio files available
            </h3>
            <p className="text-gray-600">
              Audio files will appear here once they are uploaded by an admin.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {audioFiles.map((file) => (
              <div
                key={file.key}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {file.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Size: {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentlyPlaying === file.key ? (
                      <button
                        onClick={handleStopAudio}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlayAudio(file.key)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <span>Browser Player</span>
                      </button>
                    )}
                    
                    {/* Quick external player buttons */}
                    <button
                      onClick={() => copyToClipboard(file.url)}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      📋 Copy URL
                    </button>
                    <button
                      onClick={() => openInVLC(file.url)}
                      className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
                    >
                      🔶 VLC
                    </button>
                  </div>
                </div>
                
                {currentlyPlaying === file.key && (
                  <div className="mt-4">
                    <audio
                      controls
                      className="w-full"
                      onEnded={handleStopAudio}
                    >
                      <source src={file.url} type="audio/flac" />
                      <source src={file.url} type="audio/mpeg" />
                      <source src={file.url} type="audio/wav" />
                      <source src={file.url} type="audio/ogg" />
                      Your browser does not support the audio element.
                    </audio>
                    
                    {/* Stream URL info - always visible */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                          Stream URL:
                        </h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(file.url)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            📋 Copy
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            🔗 Direct Link
                          </a>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 break-all font-mono bg-gray-50 p-2 rounded">
                        {file.url}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center space-x-4">
            <a
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              Admin Panel
            </a>
            <a
              href="/api/playlist?format=m3u"
              download="playlist.m3u"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 bg-green-100 hover:bg-green-200"
            >
              📱 Download M3U Playlist
            </a>
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="mb-2">🎵 <strong>How to stream in external players:</strong></p>
            <div className="space-y-1 text-left max-w-2xl mx-auto">
              <p><strong>foobar2000:</strong> Download M3U playlist above, then drag into foobar2000</p>
              <p><strong>VLC:</strong> Click "Open in VLC" button or use Media → Open Network Stream with individual URLs</p>
              <p><strong>Any Player:</strong> Copy stream URLs and paste into your preferred audio player</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
