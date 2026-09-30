# Photo Geo

Photo Geo is a web app to organize, browse, and edit photos using a map-based workflow.

It lets you:

- upload photos from the browser
- catalog photos that already exist on your filesystem
- browse your collection on a map
- edit metadata and coordinates
- tag and search photos
- connect external providers such as *Google Photos* and *Amazon Photos*

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```bash
PHOTO_STORAGE_ROOTS='{"main":"/run/media/test/files/Photo"}'
PHOTO_DEFAULT_STORAGE_KEY=main
PHOTO_UPLOAD_STORAGE_KEY=main
```

If you want to enable external providers, also configure their credentials:

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

You can then:

- sign in with any username
- upload photos from your browser
- open **Filesystem sync**
- add folders relative to the configured storage root
- run sync and browse your catalog

---

## What Photo Geo does

Photo Geo combines:

- a photo metadata catalog stored in SQLite through Prisma
- photos already existing on your filesystem
- optional provider integrations

The app is designed for the case where your photo files already exist in a real folder structure and you want a usable catalog and map interface on top of them.

Photo Geo stores:

- filename
- storage root key
- relative file path
- tags
- timestamps
- geolocation
- descriptive fields such as country, city, and place

Photo Geo does not need to move or duplicate filesystem-synced files.

---

## Screenshots

Store screenshots in:

```text
docs/screenshots/
```

Recommended structure:

```text
docs/
  screenshots/
    home-overview.png
    photo-edit-panel.png
    filesystem-sync-panel.png
    providers-panel.png
    by-location-tab.png
```

### Home

![Home overview](docs/screenshots/home-overview.png)

### Edit panel

![Edit panel](docs/screenshots/photo-edit-panel.png)

### Filesystem sync

![Filesystem sync panel](docs/screenshots/filesystem-sync-panel.png)

### Providers

![Providers panel](docs/screenshots/providers-panel.png)

### By location

![By location tab](docs/screenshots/by-location-tab.png)

---

## Requirements

- Node.js
- npm
- a valid Prisma/SQLite setup
- access to the folders you want to scan
- correct filesystem permissions for the user running the app

Supported image formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`

---

## Environment variables

Create a `.env.local` file in the project root.

### Minimum configuration

```bash
PHOTO_STORAGE_ROOTS='{"main":"/run/media/test/files/Photo"}'
PHOTO_DEFAULT_STORAGE_KEY=main
PHOTO_UPLOAD_STORAGE_KEY=main
```

### Optional provider configuration

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/providers/google/callback

AMAZON_CLIENT_ID=your-client-id
AMAZON_CLIENT_SECRET=your-client-secret
AMAZON_REDIRECT_URI=http://localhost:3000/api/providers/amazon/callback
AMAZON_PHOTOS_API_BASE_URL=https://photos.amazon.com/api/v1
```

---

## Installation

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Create or update the schema:

```bash
npx prisma db push
```

Optional: seed demo data

```bash
npm run seed
```

Start the app:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

---

## First-time setup

After the app starts:

1. Sign in with a username
2. Open the **Filesystem sync** section
3. Add one or more folders relative to your configured storage root
4. Run sync
5. Open the photo list and map
6. Review and edit metadata
7. Optionally connect Google Photos or Amazon Photos

Example:

If your storage root is:

```text
/run/media/test/files/Photo
```

and one folder inside it is:

```text
/run/media/test/files/Photo/TrentinoAltoAdige
```

then from the UI you add:

```text
TrentinoAltoAdige
```

not the full absolute path.

---

## Common tasks

### Add photos that already exist on disk

1. Open **Filesystem sync**
2. Click **Open**
3. Add a folder path relative to the configured root
4. Click **Run sync for all enabled folders** or **Sync this folder**
5. Open the photo list

Example relative folder:

```text
Vacanze/2024
```

### Upload photos from your computer

1. Go to the Home page
2. Use drag and drop or file selection
3. Submit the upload
4. Wait for the upload summary

### Browse photos by place

1. Open the **By location** tab
2. Select a country
3. Select a city
4. Browse the filtered results

### Edit a photo

1. Select a photo in the list
2. Use the **Edit photo** panel
3. Change caption, date, location, or tags
4. Save changes

### Set a photo position from the map

1. Select a photo
2. Click on the map
3. The selected coordinates are applied to the current photo
4. Save if needed

### Connect Google Photos

1. Open **Providers**
2. Click **Open**
3. Select **Google Photos**
4. Click **Connect**
5. Complete the provider flow

### Connect Amazon Photos

1. Open **Providers**
2. Click **Open**
3. Select **Amazon Photos**
4. Click **Connect**
5. Complete the provider flow

---

## Photo list and navigation

The photo list is paginated.

- maximum 100 photos per page
- no infinite scrolling
- explicit page navigation
- filters work together with pagination

Tabs include:

- All photos
- With geolocation
- Without geolocation
- Missing location info
- By location

---

## Map and metadata editing

You can:

- select a photo from the list
- edit caption and date
- edit coordinates manually
- click on the map to set coordinates
- edit country, city, and place
- add or remove tags

If multiple photos are selected, location changes can be applied to the full selection.

---

## Providers

The **Providers** section is collapsible.

It supports external media providers such as:

- Google Photos
- Amazon Photos

From there you can connect a provider, browse available items, and import them into Photo Geo.

---

## Filesystem sync

The **Filesystem sync** section is collapsible.

From there you can:

- add folders to scan
- enable or disable configured folders
- run sync for all enabled folders
- run sync for a single folder
- review sync output

The app stores references to files already on disk.

It does not duplicate filesystem-synced files into another storage location.

---

## Duplicate handling

Photo Geo treats filesystem photos as references to physical files.

This means:

- two different file paths can exist even if the file contents are identical
- photo identity is based on:
    - user
    - storage root
    - relative file path

Uploads may still be deduplicated according to current upload logic.

---

## Troubleshooting

### A photo returns 404

Make sure the file exists under the configured storage root.

If:

- `storageKey = main`
- `filePath = TrentinoAltoAdige/20210816_133744.jpg`

then the file must exist here:

```text
/run/media/test/files/Photo/TrentinoAltoAdige/20210816_133744.jpg
```

### Filesystem sync finds no photos

Check:

- the configured folder path
- filesystem permissions
- supported file extensions
- that the folder is inside the configured storage root

### By location does not show expected results

Check that:

- photos actually have country and city metadata
- sync completed correctly
- filters are not narrowing results unexpectedly

### Provider connection fails

Verify:

- client ID
- client secret
- redirect URI
- provider-side app configuration

---

## License

MIT