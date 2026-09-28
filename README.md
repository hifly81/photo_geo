# Photo Geo

MVP web app to upload photos, store metadata, place them on a map, and edit tags/location details.

## Features

- Local username-based sign in / sign out
- Cookie session handling via Next.js middleware + API helpers
- Protected API routes for photo and tag operations
- Per-user photo ownership
- Google Photos OAuth connect / disconnect
- Google Photos media listing and manual import into Photo Geo
- Amazon Photos OAuth connect / disconnect
- Amazon Photos media listing and manual import into Photo Geo
- Upload one or more photos from local file system
- Stronger upload validation by MIME type and size
- Basic duplicate detection by SHA-256 hash per user
- Extract EXIF metadata when available
- Save photo records with Prisma + SQLite
- Search photos by date, country, city, and tag
- Add and remove tags
- Edit photo metadata and coordinates
- Delete photos
- Click on the map to set or update a photo position
- Dedicated photo detail page
- View geolocated photos on a Leaflet map
- Basic API and utility tests for core routes/helpers
- 
## Filesystem sync setup

You can configure one or more server-side photo roots with environment variables:

```bash
PHOTO_STORAGE_ROOTS='{"main":"/photo","uploads":"./uploads"}'
PHOTO_DEFAULT_STORAGE_KEY=main
PHOTO_UPLOAD_STORAGE_KEY=uploads
```

Then, from the UI, you can configure relative folders under a storage root and run a recursive filesystem sync.

This sync saves only `storageKey` + `filePath` references in the database and does not copy synced files into `uploads/`.

### Duplicate files

The filesystem sync treats each physical path as a separate photo reference.
That means two files with the same content hash can coexist if they are stored in different folders or storage roots.

Identity is based on:
- `userId`
- `storageKey`
- `filePath`

## Tech stack

- Next.js 15 + App Router + TypeScript
- Prisma + SQLite
- Leaflet
- Zod for validation
- EXIF parsing with `exifr`
- Node test runner for API-focused tests

## Auth model

This version uses a lightweight local auth flow for MVP development:

- A user signs in with a username
- The app creates the user if it does not exist yet
- A cookie-based session stores the selected user id
- Protected APIs require the session cookie

## Google Photos setup

Create a Google Cloud OAuth client and set these environment variables in `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/providers/google/callback
```

## Amazon Photos setup

Create an Amazon Login with Amazon OAuth app and set these environment variables in `.env.local`:

```bash
AMAZON_CLIENT_ID=your-client-id
AMAZON_CLIENT_SECRET=your-client-secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/providers/amazon/callback
AMAZON_PHOTOS_API_BASE_URL=https://photos.amazon.com/api/v1
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update the database:

```bash
npx prisma generate
npx prisma db push
```

3. Optional: load demo data

```bash
npm run seed
```

4. Start the app:

```bash
npm run dev
```

5. Run tests:

```bash
npm test
```

6. Open the app at `http://localhost:3000`

## Notes

- The MVP stores uploaded files locally in `uploads/`.
- Google Photos and Amazon Photos import are manual in this version: list media, then import selected items.
- Reverse geocoding is not implemented to avoid requiring third-party API keys.
- SQLite is used for simplicity. The data model is compatible with a future move to PostgreSQL.
- Authentication is local/dev-oriented and not intended as production-grade security.

## Future work

- Automatic incremental sync from providers
- Real auth provider integration
- Cloud storage adapter for S3
- Reverse geocoding for automatic city/country suggestions
- Marker clustering on the map
