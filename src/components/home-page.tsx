'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

type Photo = {
  id: string;
  originalFilename: string;
  storagePath: string;
  source: string;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  caption: string | null;
  tags: Array<{ tag: { id: string; name: string } }>;
};

const PhotoMap = dynamic(() => import('@/components/photo-map').then((mod) => mod.PhotoMap), {
  ssr: false
});

const emptyFilters = {
  from: '',
  to: '',
  country: '',
  city: '',
  tag: ''
};

export function HomePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [uploading, setUploading] = useState(false);
  const [tagName, setTagName] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadPhotos() {
    const response = await fetch(`/api/photos${query ? `?${query}` : ''}`);
    const data = await response.json();
    setPhotos(data.photos);
    if (selectedPhoto) {
      const refreshed = data.photos.find((photo: Photo) => photo.id === selectedPhoto.id) ?? null;
      setSelectedPhoto(refreshed);
    }
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    if (!input.files?.[0]) return;

    const formData = new FormData();
    formData.append('file', input.files[0]);

    setUploading(true);
    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      input.value = '';
      await loadPhotos();
    } finally {
      setUploading(false);
    }
  }

  async function savePhoto() {
    if (!selectedPhoto) return;

    await fetch(`/api/photos/${selectedPhoto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: selectedPhoto.caption,
        country: selectedPhoto.country,
        city: selectedPhoto.city,
        latitude: selectedPhoto.latitude,
        longitude: selectedPhoto.longitude,
        takenAt: selectedPhoto.takenAt
      })
    });

    await loadPhotos();
  }

  async function addTag() {
    if (!selectedPhoto || !tagName.trim()) return;

    await fetch(`/api/photos/${selectedPhoto.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagName })
    });

    setTagName('');
    await loadPhotos();
  }

  async function removeTag(name: string) {
    if (!selectedPhoto) return;

    await fetch(`/api/photos/${selectedPhoto.id}/tags?tagName=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });

    await loadPhotos();
  }

  return (
    <main className="container stack">
      <div>
        <h1>Photo Geo</h1>
        <p>Upload photos, place them on a map, edit metadata, and search by place or time.</p>
      </div>

      <div className="grid">
        <div className="stack">
          <section className="card stack">
            <h2>Upload photo</h2>
            <form onSubmit={handleUpload} className="stack">
              <input name="file" type="file" accept="image/*" />
              <button type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </section>

          <section className="card stack">
            <h2>Filters</h2>
            <label>
              From
              <input
                type="datetime-local"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
              />
            </label>
            <label>
              To
              <input
                type="datetime-local"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
              />
            </label>
            <label>
              Country
              <input value={filters.country} onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))} />
            </label>
            <label>
              City
              <input value={filters.city} onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))} />
            </label>
            <label>
              Tag
              <input value={filters.tag} onChange={(e) => setFilters((prev) => ({ ...prev, tag: e.target.value }))} />
            </label>
            <button type="button" className="secondary" onClick={() => setFilters(emptyFilters)}>
              Reset filters
            </button>
          </section>

          {selectedPhoto && (
            <section className="card stack">
              <h2>Edit photo</h2>
              <img src={selectedPhoto.storagePath} alt={selectedPhoto.originalFilename} style={{ width: '100%', borderRadius: 8 }} />
              <label>
                Caption
                <textarea
                  value={selectedPhoto.caption ?? ''}
                  onChange={(e) => setSelectedPhoto({ ...selectedPhoto, caption: e.target.value })}
                />
              </label>
              <label>
                Taken at
                <input
                  type="datetime-local"
                  value={selectedPhoto.takenAt ? new Date(selectedPhoto.takenAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    setSelectedPhoto({
                      ...selectedPhoto,
                      takenAt: e.target.value ? new Date(e.target.value).toISOString() : null
                    })
                  }
                />
              </label>
              <div className="row">
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={selectedPhoto.latitude ?? ''}
                    onChange={(e) =>
                      setSelectedPhoto({
                        ...selectedPhoto,
                        latitude: e.target.value ? Number(e.target.value) : null
                      })
                    }
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={selectedPhoto.longitude ?? ''}
                    onChange={(e) =>
                      setSelectedPhoto({
                        ...selectedPhoto,
                        longitude: e.target.value ? Number(e.target.value) : null
                      })
                    }
                  />
                </label>
              </div>
              <div className="row">
                <label>
                  Country
                  <input
                    value={selectedPhoto.country ?? ''}
                    onChange={(e) => setSelectedPhoto({ ...selectedPhoto, country: e.target.value })}
                  />
                </label>
                <label>
                  City
                  <input
                    value={selectedPhoto.city ?? ''}
                    onChange={(e) => setSelectedPhoto({ ...selectedPhoto, city: e.target.value })}
                  />
                </label>
              </div>
              <button type="button" onClick={savePhoto}>Save changes</button>

              <div className="stack">
                <h3>Tags</h3>
                <div className="tag-list">
                  {selectedPhoto.tags.map(({ tag }) => (
                    <span key={tag.id} className="tag">
                      {tag.name}
                      <button type="button" className="danger" onClick={() => removeTag(tag.name)}>x</button>
                    </span>
                  ))}
                </div>
                <div className="row">
                  <input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. panorama" />
                  <button type="button" onClick={addTag}>Add tag</button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="stack">
          <section className="card stack">
            <h2>Map</h2>
            <div className="map-wrap">
              <PhotoMap photos={photos} onSelectPhoto={setSelectedPhoto} />
            </div>
          </section>

          <section className="card stack">
            <h2>Photos</h2>
            <div className="photo-list">
              {photos.map((photo) => (
                <article
                  key={photo.id}
                  className="photo-card card"
                  onClick={() => setSelectedPhoto(photo)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={photo.storagePath} alt={photo.originalFilename} />
                  <div className="stack">
                    <strong>{photo.originalFilename}</strong>
                    <span className="small">{photo.takenAt ? new Date(photo.takenAt).toLocaleString() : 'No date'}</span>
                    <span className="small">{photo.country || photo.city ? `${photo.city ?? ''} ${photo.country ?? ''}`.trim() : 'No location label'}</span>
                    <div className="tag-list">
                      {photo.tags.map(({ tag }) => (
                        <span key={tag.id} className="tag">{tag.name}</span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
