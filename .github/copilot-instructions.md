# Copilot Instructions for Audio Streaming Web App

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js audio streaming web application with torrent support, featuring:
- Admin panel for torrent file upload and management
- Selective audio file downloading from torrents
- FLAC audio streaming support
- Supabase authentication
- Cloudflare R2 storage integration
- VPS temporary storage (1GB limit)

## Technical Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase
- **Storage**: Cloudflare R2
- **Audio Processing**: FLAC support with HTML5 audio
- **Torrent Handling**: WebTorrent or torrent parsing libraries

## Key Features
1. **Admin Authentication**: Supabase-based admin access
2. **Torrent Upload**: Upload .torrent files via /admin route
3. **File Selection**: Choose specific audio files from torrent contents
4. **Streaming**: Stream audio files (especially FLAC) from R2 storage
5. **Storage Management**: Efficient temp storage usage and R2 upload

## Development Guidelines
- Use TypeScript for type safety
- Implement proper error handling for file operations
- Optimize for 1GB temp storage limit
- Support popular audio players (foobar2000, VLC)
- Keep UI simple and functional (no fancy styling needed)
- Implement proper streaming headers for audio files
- Use proper file validation for torrent uploads
