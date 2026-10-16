# Photo Geo

Photo Geo helps you **import, sync, geolocate, tag, search, and edit photos** through a visual workflow centered around **places, coordinates.**.

It is built for people who want a better way to manage photo archives without giving up control of their files.

---

## Demo

https://github.com/user-attachments/assets/c7330986-f3cd-47a3-b8c2-ac7758f5b8a5

---

## Why Photo Geo

Most photo tools push you toward one of two extremes:

- cloud-first products that take control away from your file structure
- large DAM-style tools that feel too heavy for personal archives

Photo Geo aims for a better middle ground:

- 🧭 **Browse visually on a map**
- 🏷️ **Enrich photos with metadata and tags**
- 📍 **Manage coordinates and place information**
- ☁️ **Optionally import from external providers**
- 🏠 **Stay self-managed**

If your library already exists on disk and you want a fast, practical, map-based catalog on top of it, Photo Geo is built for that workflow.

---

## Installation

### Requirements

- Node.js
- npm

### 0. Clone the repository

Clone the repository from GitHub:

```bash
git clone https://github.com/hifly81/photogeo.git
cd photogeo
```

If you are working from your own fork, clone your fork instead:

```bash
git clone https://github.com/<your-username>/photogeo.git
cd photogeo
```

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root.

#### Required variables

```bash
PHOTO_STORAGE_ROOTS='{"main":"/run/media/test/files/Photo"}'
PHOTO_DEFAULT_STORAGE_KEY=main
PHOTO_UPLOAD_STORAGE_KEY=main
```

#### Optional provider credentials

Set these only if you want to enable external provider integrations.

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/providers/google/callback

AMAZON_CLIENT_ID=your-client-id
AMAZON_CLIENT_SECRET=your-client-secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/providers/amazon/callback
AMAZON_PHOTOS_API_BASE_URL=https://photos.amazon.com/api/v1
```

#### Environment variable reference

- `PHOTO_STORAGE_ROOTS`  
  JSON object that defines available photo storage locations by key.

  Example:

  ```bash
  PHOTO_STORAGE_ROOTS='{"main":"/run/media/test/files/Photo","archive":"/mnt/archive/photos"}'
  ```

- `PHOTO_DEFAULT_STORAGE_KEY`  
  Storage key used by default when reading or browsing photos.

- `PHOTO_UPLOAD_STORAGE_KEY`  
  Storage key used for uploaded files.

- `GOOGLE_CLIENT_ID`  
  OAuth client ID for Google integration.

- `GOOGLE_CLIENT_SECRET`  
  OAuth client secret for Google integration.

- `GOOGLE_REDIRECT_URI`  
  OAuth callback URL for Google.

- `AMAZON_CLIENT_ID`  
  OAuth client ID for Amazon integration.

- `AMAZON_CLIENT_SECRET`  
  OAuth client secret for Amazon integration.

- `AMAZON_REDIRECT_URI`  
  OAuth callback URL for Amazon.

- `AMAZON_PHOTOS_API_BASE_URL`  
  Base API URL for Amazon Photos.

### 3. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run tests

Run the full test suite:

```bash
npm test
```

If the project supports a watch mode, you can also use:

```bash
npm run test:watch
```

### 5. Start the app in development

```bash
npm run dev
```

This starts the application with development settings and hot reload.

### 6. Start the app in production

First build the application:

```bash
npm run build
```

Then start it in production mode:

```bash
npm run start
```

### 7. Open the app

```text
http://localhost:3000
```

### 8. Sign in and add photos

After signing in with a username, you can:

- upload photos from the browser
- add folders via **Filesystem sync**
- run sync and browse your catalog

---

## How it works

Photo Geo combines:

- a metadata catalog stored in **SQLite**
- **Prisma** for schema and data access
- references to photos already available on your filesystem
- optional external provider integrations

It stores information such as:

- filename
- storage root key
- relative file path
- timestamps
- tags
- geolocation
- country, city, and place metadata

For filesystem-synced photos, Photo Geo does **not** need to move or duplicate your files.

---

## Main features

### 🗺️ Map-based browsing

Photo Geo makes the map a primary interface for exploring your archive, instead of treating geolocation as a secondary filter.

### 📂 Filesystem sync

Index photos that already exist on disk without moving them into a separate managed storage layer.

### ✍️ Metadata editing

Update:

- captions
- dates
- coordinates
- country
- city
- place
- tags

If multiple photos are selected, location updates can be applied across the whole selection.

### 🔎 Search and filtering

Browse across views such as:

- All photos
- With geolocation
- Without geolocation
- Missing location info
- By location

The photo list is paginated, with up to 100 photos per page.

### 🔌 Providers

Photo Geo can optionally connect to:

- Google Photos
- Amazon Photos

From the **Providers** section, you can connect a provider, browse items, and import them into your library.

---

## Supported image formats

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`

---

## Troubleshooting

### A photo returns 404

Make sure the file exists under the configured storage root.

If:

- `storageKey = main`
- `filePath = London/20210816_133744.jpg`

then the file must exist at:

```text
/run/media/test/files/Photo/London/20210816_133744.jpg
```

### Filesystem sync finds no photos

Check:

- the configured folder path
- filesystem permissions
- supported file extensions
- that the folder is inside the configured storage root

### By location does not show expected results

Check that:

- photos have country and city metadata
- sync completed correctly
- active filters are not too restrictive

### Provider connection fails

Verify:

- client ID
- client secret
- redirect URI
- provider-side app configuration

---

## Contributing

Contributions, ideas, and feedback are welcome.

If you care about self-managed photo archives, map-based exploration, and practical metadata workflows, feel free to open an issue or start a discussion.

---

## License

MIT
