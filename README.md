# Photo Geo

MVP web app to upload photos, store metadata, place them on a map, and edit tags/location details.

## Features

- Upload photos from local file system
- Store files on the server in `uploads/`
- Extract EXIF metadata when available
- Save photo records with Prisma + SQLite
- Search photos by date, country, city, and tag
- Add and remove tags
- Edit photo metadata and coordinates
- Delete photos
- Click on the map to set or update a photo position
- View geolocated photos on a Leaflet map
- Placeholder import provider layer for Google Photos / Amazon Photos

## Tech stack

- Next.js 15 + App Router + TypeScript
- Prisma + SQLite
- Leaflet + React Leaflet
- Zod for validation
- EXIF parsing with `exifr`

## Project structure

- `src/app` – UI pages and API routes
- `src/components` – React components
- `src/lib` – database, validation, EXIF, storage helpers
- `src/providers` – placeholder provider connectors for future Google Photos / Amazon Photos support
- `src/types` – shared frontend types
- `prisma` – schema and local SQLite database
- `uploads` – local file storage for uploaded images

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the database:

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

5. Open the app at `http://localhost:3000`

## Notes

- The MVP stores uploaded files locally in `uploads/`.
- Reverse geocoding is not implemented to avoid requiring third-party API keys.
- `country` and `city` can be edited manually after upload.
- Google Photos and Amazon Photos are not implemented yet. The `src/providers` folder contains placeholders for future connectors.
- SQLite is used for simplicity. The data model is compatible with a future move to PostgreSQL.
- There is a stub mobile app scaffold in `mobile/` to document the future Expo app direction.
- There is a storage adapter abstraction ready for a future S3-backed implementation.

## Future work

- Real Expo / React Native mobile app implementation
- Cloud storage adapter for S3
- OAuth and sync flows for Google Photos / Amazon Photos
- Reverse geocoding for automatic city/country suggestions
- Marker clustering on the map
- Multi-user auth
