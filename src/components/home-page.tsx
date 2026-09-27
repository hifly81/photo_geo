'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PhotoRecord } from '@/types/photo';
import { uploadConstraints } from '@/lib/validators';
import { LocationAutocomplete, type GeocodeResult } from '@/components/location-autocomplete';

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

type PhotoListTab = 'all' | 'missing-geolocation';

export function HomePage() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [lastSelectedPhotoId, setLastSelectedPhotoId] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [uploading, setUploading] = useState(false);
  const [tagName, setTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [photoListTab, setPhotoListTab] = useState<PhotoListTab>('all');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const photosWithoutGeolocation = useMemo(
    () => photos.filter((photo) => photo.latitude == null || photo.longitude == null),
    [photos]
  );

  const visiblePhotos = photoListTab === 'missing-geolocation' ? photosWithoutGeolocation : photos;
  const selectedPhotosCount = selectedPhotoIds.length;
  const isMultiSelection = selectedPhotosCount > 1;

  async function loadPhotos() {
    const response = await fetch(`/api/photos${query ? `?${query}` : ''}`);
    const data = await response.json();
    const nextPhotos = data.photos ?? [];
    setPhotos(nextPhotos);

    if (selectedPhoto) {
      const refreshed = nextPhotos.find((photo: PhotoRecord) => photo.id === selectedPhoto.id) ?? null;
      setSelectedPhoto(refreshed);
    }

    setSelectedPhotoIds((current) => current.filter((id) => nextPhotos.some((photo: PhotoRecord) => photo.id === id)));
    setLastSelectedPhotoId((current) => (current && nextPhotos.some((photo: PhotoRecord) => photo.id === current) ? current : null));
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (photoListTab === 'missing-geolocation' && selectedPhoto?.latitude != null && selectedPhoto?.longitude != null) {
      const stillMissing = photosWithoutGeolocation.some((photo) => photo.id === selectedPhoto.id);
      if (!stillMissing) {
        setSelectedPhoto((current) => (current?.id === selectedPhoto.id ? null : current));
      }
    }
  }, [photoListTab, photosWithoutGeolocation, selectedPhoto]);

  function validateFiles(files: File[]) {
    const invalidMime = files.find((file) => !uploadConstraints.allowedMimeTypes.includes(file.type));
    if (invalidMime) {
      return `Unsupported file type: ${invalidMime.name}`;
    }

    const oversized = files.find((file) => file.size > uploadConstraints.maxFileSizeBytes);
    if (oversized) {
      return `File too large: ${oversized.name}. Max size is ${Math.round(uploadConstraints.maxFileSizeBytes / (1024 * 1024))}MB.`;
    }

    return null;
  }

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setSuccessMessage(null);

    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Please select at least one image file.');
      return;
    }

    const validationError = validateFiles(validFiles);
    if (validationError) {
      setError(validationError);
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

      const uploadedCount = data.photos?.length ?? validFiles.length;
      const duplicateCount = data.duplicates?.length ?? 0;
      setSuccessMessage(
        duplicateCount > 0
          ? `${uploadedCount} photo(s) uploaded, ${duplicateCount} duplicate(s) skipped.`
          : `${uploadedCount} photo(s) uploaded successfully.`
      );
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

  async function saveSelectedPhotosLocation(location: {
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  }) {
    if (selectedPhotoIds.length === 0) return;

    setError(null);
    setSuccessMessage(null);

    const updates = await Promise.all(
      selectedPhotoIds.map((photoId) =>
        fetch(`/api/photos/${photoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(location)
        })
      )
    );

    const failed = updates.find((response) => !response.ok);
    if (failed) {
      const data = await failed.json();
      setError(data.error ?? 'Batch update failed');
      return;
    }

    setSuccessMessage(
      selectedPhotoIds.length > 1
        ? `Location applied to ${selectedPhotoIds.length} photos.`
        : 'Location applied to the selected photo.'
    );
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
    setSelectedPhotoIds((current) => current.filter((id) => id !== selectedPhoto.id));
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

  function applyLocation(result: GeocodeResult) {
    if (!selectedPhoto) return;

    const location = {
      city: result.city || selectedPhoto.city,
      country: result.country || selectedPhoto.country,
      latitude: result.latitude,
      longitude: result.longitude
    };

    setSelectedPhoto({
      ...selectedPhoto,
      ...location
    });

    if (selectedPhotoIds.length > 1) {
      void saveSelectedPhotosLocation(location);
    }
  }

  function handlePhotoSelection(photo: PhotoRecord, event: React.MouseEvent<HTMLElement>) {
    if (event.shiftKey && lastSelectedPhotoId) {
      const lastIndex = visiblePhotos.findIndex((item) => item.id === lastSelectedPhotoId);
      const currentIndex = visiblePhotos.findIndex((item) => item.id === photo.id);

      if (lastIndex >= 0 && currentIndex >= 0) {
        const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];
        const rangeIds = visiblePhotos.slice(start, end + 1).map((item) => item.id);
        setSelectedPhotoIds(rangeIds);
      } else {
        setSelectedPhotoIds([photo.id]);
      }
    } else {
      setSelectedPhotoIds([photo.id]);
    }

    setSelectedPhoto(photo);
    setLastSelectedPhotoId(photo.id);
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
                <span className="small">Accepted: JPEG, PNG, WEBP, GIF · max {Math.round(uploadConstraints.maxFileSizeBytes / (1024 * 1024))}MB each</span>
              </div>
              <input name="files" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
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
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{isMultiSelection ? `Edit selection (${selectedPhotosCount})` : 'Edit photo'}</h2>
                <Link href={`/photos/${selectedPhoto.id}`}>Open detail page</Link>
              </div>
              <img src={selectedPhoto.storagePath} alt={selectedPhoto.originalFilename} style={{ width: '100%', borderRadius: 8 }} />
              <div className="small">{selectedPhoto.originalFilename}</div>
              {isMultiSelection && <div className="small">Shift + click selection active. Geo/city/country changes apply to all selected photos.</div>}
              <label>
                Caption
                <textarea
                  value={selectedPhoto.caption ?? ''}
                  onChange={(e) => setSelectedPhoto({ ...selectedPhoto, caption: e.target.value })}
                  disabled={isMultiSelection}
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
                  disabled={isMultiSelection}
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
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <label>
                  Country
                  <input
                    value={selectedPhoto.country ?? ''}
                    onChange={(e) => setSelectedPhoto({ ...selectedPhoto, country: e.target.value })}
                  />
                </label>
                <LocationAutocomplete
                  label="City"
                  value={selectedPhoto.city ?? ''}
                  placeholder="Start typing a city or place"
                  onChange={(value) =>
                    setSelectedPhoto({
                      ...selectedPhoto,
                      city: value,
                      latitude: null,
                      longitude: null
                    })
                  }
                  onSelect={applyLocation}
                />
              </div>
              <div className="row">
                <button
                  type="button"
                  onClick={() => {
                    if (isMultiSelection) {
                      void saveSelectedPhotosLocation({
                        city: selectedPhoto.city ?? null,
                        country: selectedPhoto.country ?? null,
                        latitude: selectedPhoto.latitude ?? null,
                        longitude: selectedPhoto.longitude ?? null
                      });
                      return;
                    }

                    void savePhoto();
                  }}
                >
                  {isMultiSelection ? `Apply location to ${selectedPhotosCount} photos` : 'Save changes'}
                </button>
                <button type="button" className="danger" onClick={deletePhoto} disabled={isMultiSelection}>Delete photo</button>
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
                  <button type="button" onClick={addTag} disabled={isMultiSelection}>Add tag</button>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="stack">
          <section className="card stack">
            <h2>Map</h2>
            <div className="map-wrap">
              <PhotoMap photos={visiblePhotos} selectedPhoto={selectedPhoto} onSelectPhoto={setSelectedPhoto} onPickLocation={(lat, lng) => {
                if (!selectedPhoto) return;
                const nextPhoto = { ...selectedPhoto, latitude: lat, longitude: lng };
                setSelectedPhoto(nextPhoto);

                if (selectedPhotoIds.length > 1) {
                  void saveSelectedPhotosLocation({
                    city: nextPhoto.city ?? null,
                    country: nextPhoto.country ?? null,
                    latitude: lat,
                    longitude: lng
                  });
                }
              }} />
            </div>
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Photos</h2>
              <span className="small">{visiblePhotos.length} result(s)</span>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={photoListTab === 'all' ? '' : 'secondary'}
                onClick={() => setPhotoListTab('all')}
              >
                All photos ({photos.length})
              </button>
              <button
                type="button"
                className={photoListTab === 'missing-geolocation' ? '' : 'secondary'}
                onClick={() => setPhotoListTab('missing-geolocation')}
              >
                Without geolocation ({photosWithoutGeolocation.length})
              </button>
            </div>
            <div className="small">Click to select one photo. Use Shift + click to select a range and apply the same geo/city/country.</div>
            <div className="photo-list">
              {visiblePhotos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);
                return (
                  <article
                    key={photo.id}
                    className="photo-card card"
                    onClick={(event) => handlePhotoSelection(photo, event)}
                    style={{ cursor: 'pointer', border: isSelected ? '2px solid #0f62fe' : undefined }}
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
                      <Link href={`/photos/${photo.id}`}>View details</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
