# Photo Geo

Photo Geo helps you **import, sync, geolocate, tag, search, and edit photos** through a visual workflow centered around **places, coordinates.**.

It is built for people who want a better way to manage photo archives without giving up control of their files.

---

## Demo

<details>
 <summary style="cursor: pointer;">
    <h3 style="display: inline; color: #0366d6;">🎥 Click to watch a demo</h3>
  </summary>
  <br>
  <div align="center">
    <video src="https://github.com/hifly81/photo_geo/raw/refs/heads/main/media/demo.mp4" width="100%" controls autoplay muted loop>
    </video>
  </div>
</details>

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

## Highlights

- 🗺️ **Map-first browsing** for exploring photos by location
- 📂 **Filesystem sync** without duplicating existing files
- ✍️ **Metadata editing** for captions, dates, tags, and coordinates
- 🔎 **Search and filtering** across location and completeness states
- 🌍 **Place-based organization** by country, city, and place
- 🔌 **Provider integrations** such as Google Photos and Amazon Photos
- 🧱 **Lightweight stack** powered by SQLite and Prisma

---

## Quick Start

### Requirements

- Node.js
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```bash
PHOTO_STORAGE_ROOTS='{"main":"/run/media/test/files/Photo"}'
PHOTO_DEFAULT_STORAGE_KEY=main
PHOTO_UPLOAD_STORAGE_KEY=main
```

Optional provider credentials:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/providers/google/callback

AMAZON_CLIENT_ID=your-client-id
AMAZON_CLIENT_SECRET=your-client-secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/providers/amazon/callback
AMAZON_PHOTOS_API_BASE_URL=https://photos.amazon.com/api/v1
```

### 3. Prepare the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Start the app

```bash
npm run dev
```

### 5. Open the app

```text
http://localhost:3000
```

### 6. Sign in and add photos

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

## Typical workflow

1. Configure one or more storage roots
2. Sign in with a username
3. Add folders relative to the configured root
4. Run filesystem sync
5. Browse your collection in the list and on the map
6. Edit metadata, tags, and coordinates
7. Optionally connect external providers and import content

Example:

If your storage root is:

```text
/run/media/test/files/Photo
```

and a folder inside it is:

```text
/run/media/test/files/Photo/London
```

then in the UI you should add:

```text
London
```

not the full absolute path.

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

## Filesystem sync notes

The **Filesystem sync** section allows you to:

- add folders to scan
- enable or disable configured folders
- run sync for all enabled folders
- run sync for a single folder
- review sync output

Photo Geo stores references to files already present on disk.

It does not duplicate filesystem-synced files into another storage location.

---

## Duplicate handling

For filesystem-based photos, identity is based on:

- user
- storage root
- relative file path

This means two different paths can exist even if the contents are identical.

Uploads may still be deduplicated according to the current upload logic.

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