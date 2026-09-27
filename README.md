# Photo Geo

MVP web app to upload photos, store metadata, place them on a map, and edit tags/location details.

## Features

- Local username-based sign in / sign out
- Cookie session handling via Next.js middleware + API helpers
- Protected API routes for photo and tag operations
- Per-user photo ownership
- Upload one or more photos from local file system
- Stronger upload validation by MIME type and size
- Basic duplicate detection by SHA-256 hash per user
- Store files on the server in `uploads/`
- Extract EXIF metadata when available
- Save photo records with Prisma + SQLite
- Search photos by date, country, city, and tag
- Add and remove tags
- Edit photo metadata and coordinates
- Delete photos
- Click on the map to set or update a photo position
- Dedicated photo detail page
- View geolocated photos on a Leaflet map
- Placeholder import provider layer for Google Photos / Amazon Photos
- Basic API and utility tests for core routes/helpers
- Backfill script for legacy `fileHash` values

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

This is intentionally simple and can later be replaced by NextAuth/Auth.js, Clerk, or a custom auth provider.

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

3. Optional: backfill missing hashes for existing photos

```bash
npm run backfill:filehash
```

4. Optional: load demo data

```bash
npm run seed
```

5. Start the app:

```bash
npm run dev
```

6. Run tests:

```bash
npm test
```

7. Open the app at `http://localhost:3000`

## Notes

- The MVP stores uploaded files locally in `uploads/`.
- Reverse geocoding is not implemented to avoid requiring third-party API keys.
- `country` and `city` can be edited manually after upload.
- Google Photos and Amazon Photos are not implemented yet. The `src/providers` folder contains placeholders for future connectors.
- SQLite is used for simplicity. The data model is compatible with a future move to PostgreSQL.
- Duplicate detection is best-effort for the local MVP and uses file hashes.
- Authentication is local/dev-oriented and not intended as production-grade security.

## Future work

- Real auth provider integration
- Real Expo / React Native mobile app implementation
- Cloud storage adapter for S3
- OAuth and sync flows for Google Photos / Amazon Photos
- Reverse geocoding for automatic city/country suggestions
- Marker clustering on the map
