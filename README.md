# Audio Streaming Web App

A Next.js web application for streaming audio files with torrent support, featuring admin panel for file management and high-quality audio streaming including FLAC support.

## Features

- **Admin Panel**: Upload torrent files and manage audio downloads
- **Torrent Processing**: Parse torrent files and show selectable audio files
- **Selective Download**: Choose specific audio files from torrent contents
- **Audio Streaming**: Stream audio files with FLAC support
- **Cloud Storage**: Integrates with Cloudflare R2 for audio file storage
- **Authentication**: Supabase-based admin authentication
- **Efficient Storage**: Manages VPS temp storage (1GB limit)

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase
- **Storage**: Cloudflare R2
- **Audio Processing**: HTML5 audio with FLAC support
- **Torrent Handling**: parse-torrent library

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nextjs-stream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `R2_ACCOUNT_ID`: Your Cloudflare R2 account ID
   - `R2_ACCESS_KEY_ID`: Your R2 access key
   - `R2_SECRET_ACCESS_KEY`: Your R2 secret key
   - `R2_BUCKET_NAME`: Your R2 bucket name
   - `R2_ENDPOINT`: Your R2 endpoint URL
   - `ADMIN_EMAIL`: Admin email address for authentication

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Usage

### Admin Panel

1. Go to `/admin/login` to access the admin panel
2. Login with your configured admin credentials
3. Upload torrent files using the upload interface
4. Select specific audio files from the torrent contents
5. Download selected files (they'll be processed and uploaded to R2)

### Audio Streaming

1. Visit the main page to see available audio files
2. Click play on any audio file to start streaming
3. Supports various audio formats including FLAC
4. Audio is streamed directly from R2 storage

## API Routes

- `POST /api/auth` - Admin authentication
- `DELETE /api/auth` - Admin logout
- `POST /api/admin/torrent/upload` - Upload torrent file
- `POST /api/admin/torrent/download` - Download selected audio files
- `GET /api/stream` - Stream audio files

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx     # Admin login page
│   │   └── page.tsx         # Admin dashboard
│   ├── api/
│   │   ├── admin/
│   │   │   └── torrent/
│   │   │       ├── upload/
│   │   │       │   └── route.ts  # Torrent upload API
│   │   │       └── download/
│   │   │           └── route.ts  # File download API
│   │   ├── auth/
│   │   │   └── route.ts     # Authentication API
│   │   └── stream/
│   │       └── route.ts     # Audio streaming API
│   └── page.tsx             # Main streaming page
├── lib/
│   ├── auth.ts              # Authentication utilities
│   ├── r2.ts                # R2 client configuration
│   ├── storage.ts           # File storage utilities
│   ├── supabase.ts          # Supabase client
│   └── torrent.ts           # Torrent processing utilities
```

## Development

This project uses:
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- ESLint for code linting

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
