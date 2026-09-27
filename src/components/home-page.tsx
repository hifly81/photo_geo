'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PhotoRecord } from '@/types/photo';

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
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [uploading, setUploading] = useState(false);
  const [tagName, setTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);

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
    setPhotos(data.photos ?? []);
    if (selectedPhoto) {
      const refreshed = (data.photos ?? []).find((photo: PhotoRecord) => photo.id === selectedPhoto.id) ?? null;
      setSelectedPhoto(refreshed);
    }
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setSuccessMessage(null);

    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Please select at least one image file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Upload failed');
      }

      setSuccessMessage(`${data.photos?.length ?? validFiles.length} photo(s) uploaded successfully.`);
      await loadPhotos();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('files') as HTMLInputElement;
    if (!input.files?.length) return;

    await uploadFiles(input.files);
    input.value = '';
  }

  async function savePhoto() {
    if (!selectedPhoto) return;
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/photos/${selectedPhoto.id}`, {
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

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Save failed');
      return;
    }

    setSuccessMessage('Photo updated successfully.');
    await loadPhotos();
  }

  async function deletePhoto() {
    if (!selectedPhoto) return;
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/photos/${selectedPhoto.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Delete failed');
      return;
    }

    setSelectedPhoto(null);
    setSuccessMessage('Photo deleted successfully.');
    await loadPhotos();
  }

  async function addTag() {
    if (!selectedPhoto || !tagName.trim()) return;
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/photos/${selectedPhoto.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagName })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Could not add tag');
      return;
    }

    setTagName('');
    setSuccessMessage('Tag added successfully.');
    await loadPhotos();
  }

  async function removeTag(name: string) {
    if (!selectedPhoto) return;
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/photos/${selectedPhoto.id}/tags?tagName=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Could not remove tag');
      return;
    }

    setSuccessMessage('Tag removed successfully.');
    await loadPhotos();
  }

  return (
    <main className="container stack">
      <div>
        <h1>Photo Geo</h1>
        <p>Upload photos, place them on a map, edit metadata, and search by place or time.</p>
      </div>

      {error && <div className="card error-banner">{error}</div>}
      {successMessage && <div className="card success-banner">{successMessage}</div>}

      <div className="grid">
        <div className="stack">
          <section className="card stack">
            <h2>Upload photo</h2>
            <form onSubmit={handleUpload} className="stack">
              <div
                className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragCounter.current += 1;
                  setDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => {
                  e.preventDefault();
                  dragCounter.current -= 1;
                  if (dragCounter.current <= 0) {
                    setDragging(false);
                    dragCounter.current = 0;
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  dragCounter.current = 0;
                  setDragging(false);
                  if (e.dataTransfer.files?.length) {
                    await uploadFiles(e.dataTransfer.files);
                  }
                }}
              >
                <strong>Drag & drop photos here</strong>
                <span className="small">or select one or more files below</span>
              </div>
              <input name="files" type="file" accept="image/*" multiple />
              <button type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload selected photos'}
              </button>
            </form>
            <span className="small">Supported via browser upload. Provider sync will be added later.</span>
          </section>

          <section className="card stack">
            <h2>Filters</h2>
            <label>
              From
              <input
                type="datetime-local"
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
              />
            </label>
            <label>
              To
              <input
                type="datetime-local"
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
              <div className="small">{selectedPhoto.originalFilename}</div>
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
              <span className="small">Tip: click on the map while this photo is selected to set its position.</span>
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
              <div className="row">
                <button type="button" onClick={savePhoto}>Save changes</button>
                <button type="button" className="danger" onClick={deletePhoto}>Delete photo</button>
              </div>

              <div className="stack">
                <h3>Tags</h3>
                <div className="tag-list">
                  {selectedPhoto.tags.map(({ tag }) => (
                    <span key={tag.id} className="tag">
                      {tag.name}
                      <button type="button" className="danger small-button" onClick={() => removeTag(tag.name)}>x</button>
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
              <PhotoMap photos={photos} selectedPhoto={selectedPhoto} onSelectPhoto={setSelectedPhoto} onPickLocation={(lat, lng) => {
                if (!selectedPhoto) return;
                setSelectedPhoto({ ...selectedPhoto, latitude: lat, longitude: lng });
              }} />
            </div>
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Photos</h2>
              <span className="small">{photos.length} result(s)</span>
            </div>
            <div className="photo-list">
              {photos.map((photo) => (
                <article
                  key={photo.id}
                  className="photo-card card"
                  onClick={() => setSelectedPhoto(photo)}
                  style={{ cursor: 'pointer', border: selectedPhoto?.id === photo.id ? '2px solid #0f62fe' : undefined }}
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
