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
- View geolocated photos on a Leaflet map

## Tech stack

- Next.js 15 + App Router + TypeScript
- Prisma + SQLite
- Leaflet + React Leaflet
- Zod for validation
- EXIF parsing with `exifr`
- Multipart handling with `formidable`

## Project structure

- `src/app` – UI pages and API routes
- `src/components` – React components
- `src/lib` – database, validation, EXIF, storage helpers
- `src/providers` – placeholder provider connectors for future Google Photos / Amazon Photos support
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

3. Start the app:

```bash
npm run dev
```

4. Open the app at `http://localhost:3000`

## Notes

- The MVP stores uploaded files locally in `uploads/`.
- Reverse geocoding is not implemented to avoid requiring third-party API keys.
- `country` and `city` can be edited manually after upload.
- Google Photos and Amazon Photos are not implemented yet. The `src/providers` folder contains placeholders for future connectors.
- SQLite is used for simplicity. The data model is compatible with a future move to PostgreSQL.

## Future work

- Mobile app with Expo / React Native
- Cloud storage adapter for S3
- OAuth and sync flows for Google Photos / Amazon Photos
- Reverse geocoding for automatic city/country suggestions
- Clustering on the map
- Multi-user auth
