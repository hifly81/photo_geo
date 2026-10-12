'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PhotoRecord } from '@/types/photo';
import type { PhotoSuggestions } from '@/types/photo-suggestions';
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

const photosPerPage = 100;
const minMapHeight = 320;
const maxMapHeight = 900;
const mapResizeStep = 120;

type PhotoListTab = 'all' | 'with-geolocation' | 'missing-geolocation' | 'missing-location-info' | 'by-location';

type HomePageProps = {
  selectedTags?: string[];
  selectedPersonId?: string | null;
  selectedClusterKey?: string | null;
};

export function HomePage({
                           selectedTags = [],
                           selectedPersonId = null,
                           selectedClusterKey = null
                         }: HomePageProps) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [lastSelectedPhotoId, setLastSelectedPhotoId] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [tagName, setTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [photoListTab, setPhotoListTab] = useState<PhotoListTab>('all');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(true);
  const [mapHeight, setMapHeight] = useState(720);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotoSuggestions | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    withGeolocation: 0,
    missingGeolocation: 0,
    missingLocationInfo: 0,
    byLocation: 0
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const activeFilters = { ...filters };

    if (photoListTab === 'by-location') {
      activeFilters.country = '';
      activeFilters.city = '';
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (key === 'tag') return;
      if (value) params.set(key, value);
    });

    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }

    if (selectedPersonId) {
      params.set('personId', selectedPersonId);
    }

    if (selectedClusterKey) {
      params.set('clusterKey', selectedClusterKey);
    }

    params.set('page', String(currentPage));
    params.set('pageSize', String(photosPerPage));
    params.set('locationCountry', locationCountry);
    params.set('locationCity', locationCity);

    if (photoListTab === 'with-geolocation') {
      params.set('mode', 'with-geolocation');
    } else if (photoListTab === 'missing-geolocation') {
      params.set('mode', 'missing-geolocation');
    } else if (photoListTab === 'missing-location-info') {
      params.set('mode', 'missing-location-info');
    } else {
      params.set('mode', 'all');
    }

    return params.toString();
  }, [
    currentPage,
    filters,
    locationCity,
    locationCountry,
    photoListTab,
    selectedClusterKey,
    selectedPersonId,
    selectedTags
  ]);

  const selectedPhotosCount = selectedPhotoIds.length;
  const isMultiSelection = selectedPhotosCount > 1;

  async function loadPhotos() {
    const response = await fetch(`/api/photos?${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to load photos');
    }

    const nextPhotos = data.photos ?? [];
    setPhotos(nextPhotos);
    setTotalPhotos(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setCounts({
      all: data.counts?.all ?? 0,
      withGeolocation: data.counts?.withGeolocation ?? 0,
      missingGeolocation: data.counts?.missingGeolocation ?? 0,
      missingLocationInfo: data.counts?.missingLocationInfo ?? 0,
      byLocation: data.counts?.byLocation ?? 0
    });
    setAvailableCountries(data.availableCountries ?? []);
    setAvailableCities(data.availableCities ?? []);

    if (selectedPhoto) {
      const refreshed = nextPhotos.find((photo: PhotoRecord) => photo.id === selectedPhoto.id) ?? null;
      setSelectedPhoto(refreshed);
    }

    setSelectedPhotoIds((current) => current.filter((id) => nextPhotos.some((photo: PhotoRecord) => photo.id === id)));
    setLastSelectedPhotoId((current) => (current && nextPhotos.some((photo: PhotoRecord) => photo.id === current) ? current : null));
  }

  useEffect(() => {
    void loadPhotos().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load photos');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    photoListTab,
    filters.from,
    filters.to,
    filters.country,
    filters.city,
    locationCountry,
    locationCity,
    selectedTags,
    selectedPersonId,
    selectedClusterKey
  ]);

  useEffect(() => {
    if (selectedPhoto && !photos.some((photo) => photo.id === selectedPhoto.id)) {
      setSelectedPhoto(null);
      setIsEditorOpen(false);
      setSuggestions(null);
    }
  }, [photos, selectedPhoto]);

  useEffect(() => {
    if (locationCountry && !availableCountries.includes(locationCountry)) {
      setLocationCountry('');
      setLocationCity('');
      return;
    }

    if (locationCity && !availableCities.includes(locationCity)) {
      setLocationCity('');
    }
  }, [availableCities, availableCountries, locationCity, locationCountry]);

  useEffect(() => {
    setPlaceQuery(selectedPhoto?.placeName ?? selectedPhoto?.city ?? '');
  }, [selectedPhoto?.id, selectedPhoto?.placeName, selectedPhoto?.city]);

  useEffect(() => {
    setSuggestions(null);
  }, [selectedPhoto?.id, isMultiSelection]);

  function openEditor(photo?: PhotoRecord) {
    if (photo) {
      setSelectedPhoto(photo);
      if (!selectedPhotoIds.includes(photo.id)) {
        setSelectedPhotoIds([photo.id]);
      }
      setLastSelectedPhotoId(photo.id);
    }

    if (!selectedPhoto && !photo) return;
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setTagName('');
    setSuggestions(null);
  }

  async function analyzeSelectedPhoto() {
    if (!selectedPhoto || isMultiSelection) return;

    setError(null);
    setSuccessMessage(null);
    setSuggestions(null);
    setIsAnalyzingPhoto(true);

    try {
      const response = await fetch(`/api/photos/${selectedPhoto.id}/suggestions`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to analyze photo');
      }

      setSuggestions(data.suggestions ?? {});
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Failed to analyze photo');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }

  function applySuggestionField(field: keyof PhotoSuggestions) {
    if (!selectedPhoto || !suggestions) return;

    if (field === 'tags') {
      const nextTags = suggestions.tags ?? [];
      if (nextTags.length === 0) return;

      const existingTagNames = new Set(selectedPhoto.tags.map(({ tag }) => tag.name.toLowerCase()));
      const newTagItems = nextTags
          .filter((name) => !existingTagNames.has(name.toLowerCase()))
          .map((name, index) => ({
            tag: {
              id: `suggested-${index}-${name}`,
              name
            }
          }));

      setSelectedPhoto({
        ...selectedPhoto,
        tags: [...selectedPhoto.tags, ...newTagItems]
      });

      setSuggestions((current) => {
        if (!current) return current;
        const next = { ...current };
        delete next.tags;
        return next;
      });

      return;
    }

    const value = suggestions[field];
    if (value == null) return;

    const nextPhoto: PhotoRecord = { ...selectedPhoto };

    if (field === 'caption' && typeof value === 'string') {
      nextPhoto.caption = value;
    }

    if (field === 'takenAt' && typeof value === 'string') {
      nextPhoto.takenAt = value;
    }

    if (field === 'latitude' && typeof value === 'number') {
      nextPhoto.latitude = value;
    }

    if (field === 'longitude' && typeof value === 'number') {
      nextPhoto.longitude = value;
    }

    if (field === 'country' && typeof value === 'string') {
      nextPhoto.country = value;
    }

    if (field === 'placeName' && typeof value === 'string') {
      nextPhoto.placeName = value;
      setPlaceQuery(value);
    }

    if (field === 'city' && typeof value === 'string') {
      nextPhoto.city = value;
    }

    setSelectedPhoto(nextPhoto);

    setSuggestions((current) => {
      if (!current) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function applyAllSuggestions() {
    if (!selectedPhoto || !suggestions) return;

    let nextPhoto: PhotoRecord = { ...selectedPhoto };

    if (typeof suggestions.caption === 'string') {
      nextPhoto.caption = suggestions.caption;
    }

    if (typeof suggestions.takenAt === 'string') {
      nextPhoto.takenAt = suggestions.takenAt;
    }

    if (typeof suggestions.latitude === 'number') {
      nextPhoto.latitude = suggestions.latitude;
    }

    if (typeof suggestions.longitude === 'number') {
      nextPhoto.longitude = suggestions.longitude;
    }

    if (typeof suggestions.country === 'string') {
      nextPhoto.country = suggestions.country;
    }

    if (typeof suggestions.placeName === 'string') {
      nextPhoto.placeName = suggestions.placeName;
      setPlaceQuery(suggestions.placeName);
    }

    if (typeof suggestions.city === 'string') {
      nextPhoto.city = suggestions.city;
    }

    if (Array.isArray(suggestions.tags) && suggestions.tags.length > 0) {
      const existingTagNames = new Set(nextPhoto.tags.map(({ tag }) => tag.name.toLowerCase()));
      const newTagItems = suggestions.tags
          .filter((name) => !existingTagNames.has(name.toLowerCase()))
          .map((name, index) => ({
            tag: {
              id: `suggested-${index}-${name}`,
              name
            }
          }));

      nextPhoto.tags = [...nextPhoto.tags, ...newTagItems];
    }

    setSelectedPhoto(nextPhoto);
    setSuggestions({});
  }

  function hasSuggestions(currentSuggestions: PhotoSuggestions | null) {
    if (!currentSuggestions) return false;

    return Boolean(
        currentSuggestions.caption ||
        currentSuggestions.takenAt ||
        typeof currentSuggestions.latitude === 'number' ||
        typeof currentSuggestions.longitude === 'number' ||
        currentSuggestions.country ||
        currentSuggestions.placeName ||
        currentSuggestions.city ||
        (currentSuggestions.tags && currentSuggestions.tags.length > 0)
    );
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
        placeName: selectedPhoto.placeName,
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
    placeName?: string | null;
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

  async function deletePhoto(photoToDelete: PhotoRecord | null = selectedPhoto) {
    if (!photoToDelete) return;
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/photos/${photoToDelete.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Delete failed');
      return;
    }

    setSelectedPhoto((current) => (current?.id === photoToDelete.id ? null : current));
    setSelectedPhotoIds((current) => current.filter((id) => id !== photoToDelete.id));
    setSuccessMessage('Photo deleted successfully.');
    setIsEditorOpen(false);
    setSuggestions(null);
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

  async function addSuggestedTags(tags: string[]) {
    if (!selectedPhoto || tags.length === 0 || isMultiSelection) return;

    setError(null);
    setSuccessMessage(null);

    for (const suggestedTag of tags) {
      const response = await fetch(`/api/photos/${selectedPhoto.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: suggestedTag })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? `Could not add suggested tag: ${suggestedTag}`);
        return;
      }
    }

    setSuggestions((current) => {
      if (!current) return current;
      const next = { ...current };
      delete next.tags;
      return next;
    });

    setSuccessMessage('Suggested tags added successfully.');
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
      placeName: result.name || selectedPhoto.placeName || selectedPhoto.city,
      latitude: result.latitude,
      longitude: result.longitude
    };

    setPlaceQuery(result.name || result.label);
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
      const lastIndex = photos.findIndex((item) => item.id === lastSelectedPhotoId);
      const currentIndex = photos.findIndex((item) => item.id === photo.id);

      if (lastIndex >= 0 && currentIndex >= 0) {
        const [start, end] = lastIndex < currentIndex ? [lastIndex, currentIndex] : [currentIndex, lastIndex];
        const rangeIds = photos.slice(start, end + 1).map((item) => item.id);
        const clickedPhotoWasSelected = selectedPhotoIds.includes(photo.id);

        setSelectedPhotoIds((current) => {
          const next = new Set(current);
          rangeIds.forEach((id) => {
            if (clickedPhotoWasSelected) {
              next.delete(id);
            } else {
              next.add(id);
            }
          });
          return photos.filter((item) => next.has(item.id)).map((item) => item.id);
        });
      } else {
        setSelectedPhotoIds((current) =>
            current.includes(photo.id)
                ? current.filter((id) => id !== photo.id)
                : [...current, photo.id]
        );
      }
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedPhotoIds((current) =>
          current.includes(photo.id)
              ? current.filter((id) => id !== photo.id)
              : [...current, photo.id]
      );
    } else {
      setSelectedPhotoIds([photo.id]);
    }

    setSelectedPhoto(photo);
    setLastSelectedPhotoId(photo.id);
  }

  function increaseMapHeight() {
    setMapHeight((current) => Math.min(current + mapResizeStep, maxMapHeight));
  }

  function decreaseMapHeight() {
    setMapHeight((current) => Math.max(current - mapResizeStep, minMapHeight));
  }

  function openOriginalImage() {
    if (!selectedPhoto) return;
    window.open(selectedPhoto.imageUrl, '_blank', 'noopener,noreferrer');
  }

  return (
      <main className="container stack">
        <div>
          <h1>Photo Geo</h1>
          <p>Upload photos, place them on a map, edit metadata, and search by place or time.</p>
        </div>

        {error && <div className="card error-banner">{error}</div>}
        {successMessage && <div className="card success-banner">{successMessage}</div>}

        <div className="stack">
          <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>Map</h2>
                <div className="small">
                  Use the controls to open/close the map and change how much vertical space it uses.
                </div>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="secondary" onClick={decreaseMapHeight} disabled={!isMapOpen || mapHeight <= minMapHeight}>
                  Smaller
                </button>
                <button type="button" className="secondary" onClick={increaseMapHeight} disabled={!isMapOpen || mapHeight >= maxMapHeight}>
                  Larger
                </button>
                <button type="button" className="secondary" onClick={() => setIsMapOpen((current) => !current)}>
                  {isMapOpen ? 'Close map' : 'Open map'}
                </button>
              </div>
            </div>

            <div
                style={{
                  height: isMapOpen ? mapHeight : 0,
                  overflow: 'hidden',
                  transition: 'height 0.25s ease'
                }}
            >
              <div className="map-wrap" style={{ height: mapHeight }}>
                <PhotoMap
                    photos={photos}
                    selectedPhoto={selectedPhoto}
                    onSelectPhoto={setSelectedPhoto}
                    onPickLocation={(lat, lng) => {
                      if (!selectedPhoto) return;
                      const nextPhoto = { ...selectedPhoto, latitude: lat, longitude: lng };
                      setSelectedPhoto(nextPhoto);

                      if (selectedPhotoIds.length > 1) {
                        void saveSelectedPhotosLocation({
                          city: nextPhoto.city ?? null,
                          country: nextPhoto.country ?? null,
                          placeName: nextPhoto.placeName ?? null,
                          latitude: lat,
                          longitude: lng
                        });
                      }
                    }}
                />
              </div>
            </div>
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Photos</h2>
              <span className="small">
              {totalPhotos} result(s) · page {currentPage} of {totalPages}
            </span>
            </div>

            <div
                className="card stack"
                style={{
                  position: 'sticky',
                  top: 12,
                  zIndex: 20,
                  padding: 12,
                  background: 'var(--background, #fff)',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)'
                }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button
                      type="button"
                      className={photoListTab === 'all' ? '' : 'secondary'}
                      onClick={() => setPhotoListTab('all')}
                  >
                    All photos ({counts.all})
                  </button>
                  <button
                      type="button"
                      className={photoListTab === 'with-geolocation' ? '' : 'secondary'}
                      onClick={() => setPhotoListTab('with-geolocation')}
                  >
                    With geolocation ({counts.withGeolocation})
                  </button>
                  <button
                      type="button"
                      className={photoListTab === 'missing-geolocation' ? '' : 'secondary'}
                      onClick={() => setPhotoListTab('missing-geolocation')}
                  >
                    Without geolocation ({counts.missingGeolocation})
                  </button>
                  <button
                      type="button"
                      className={photoListTab === 'missing-location-info' ? '' : 'secondary'}
                      onClick={() => setPhotoListTab('missing-location-info')}
                  >
                    Missing location info ({counts.missingLocationInfo})
                  </button>
                  <button
                      type="button"
                      className={photoListTab === 'by-location' ? '' : 'secondary'}
                      onClick={() => setPhotoListTab('by-location')}
                  >
                    By location ({counts.byLocation})
                  </button>
                </div>

                <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="small">
                  Active tags: {selectedTags.length > 0 ? selectedTags.join(', ') : 'none'}
                </span>
                  <span className="small">
                  Person filter: {selectedPersonId ? 'named person' : selectedClusterKey ? 'unnamed cluster' : 'none'}
                </span>
                  <span className="small">Selected: {selectedPhotosCount}</span>
                  <button
                      type="button"
                      onClick={() => openEditor()}
                      disabled={!selectedPhoto}
                  >
                    {isMultiSelection ? `Edit selected (${selectedPhotosCount})` : 'Edit selected'}
                  </button>
                </div>
              </div>

              <div className="stack" style={{ gap: 12 }}>
                <strong>Filters</strong>

                {photoListTab === 'by-location' && (
                    <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <label>
                        Country
                        <select
                            value={locationCountry}
                            onChange={(e) => {
                              setLocationCountry(e.target.value);
                              setLocationCity('');
                            }}
                        >
                          <option value="">Select a country</option>
                          {availableCountries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        City
                        <select
                            value={locationCity}
                            onChange={(e) => setLocationCity(e.target.value)}
                            disabled={!locationCountry}
                        >
                          <option value="">Select a city</option>
                          {availableCities.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                          ))}
                        </select>
                      </label>
                    </div>
                )}

                <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                  <button type="button" className="secondary" onClick={() => setFilters(emptyFilters)}>
                    Reset filters
                  </button>
                </div>
              </div>

              <div className="small">
                {photoListTab === 'by-location'
                    ? 'Choose a country and a city to show only photos from that location.'
                    : 'Click to select one photo. Shift + click extends a range, Ctrl/Cmd + click toggles photos. Double click opens the editor.'}
              </div>

              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="small">
                Showing {photos.length} of {totalPhotos} photo(s)
              </span>

                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <button
                      type="button"
                      className="secondary"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage <= 1}
                  >
                    Previous
                  </button>
                  <span className="small">
                  Page {currentPage} / {totalPages}
                </span>
                  <button
                      type="button"
                      className="secondary"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="photo-list">
              {photos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);

                return (
                    <article
                        key={photo.id}
                        className="photo-card card"
                        onClick={(event) => handlePhotoSelection(photo, event)}
                        onDoubleClick={() => openEditor(photo)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #0f62fe' : undefined,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                    >
                      <div
                          className="row"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            gap: 8,
                            zIndex: 1
                          }}
                      >
                        <button
                            type="button"
                            className="secondary"
                            aria-label={`Edit ${photo.originalFilename}`}
                            title="Edit photo"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditor(photo);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '999px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              lineHeight: 1
                            }}
                        >
                          ✎
                        </button>

                        <button
                            type="button"
                            className="danger"
                            aria-label={`Delete ${photo.originalFilename}`}
                            title="Delete photo"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deletePhoto(photo);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '999px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              lineHeight: 1
                            }}
                        >
                          ×
                        </button>
                      </div>

                      <img src={photo.imageUrl} alt={photo.originalFilename} />
                      <div className="stack" style={{ minWidth: 0 }}>
                        <strong
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                            title={photo.originalFilename}
                        >
                          {photo.originalFilename}
                        </strong>
                        <span className="small">{photo.takenAt ? new Date(photo.takenAt).toLocaleString() : 'No date'}</span>
                        {'missingFromDisk' in photo && photo.missingFromDisk ? (
                            <span className="small" style={{ color: '#b42318' }}>Missing from disk</span>
                        ) : null}
                        <span className="small">
                      {photo.placeName || photo.country || photo.city
                          ? [photo.placeName, photo.city, photo.country].filter(Boolean).join(' · ')
                          : 'No location label'}
                    </span>
                        <div className="tag-list">
                          {photo.tags.map(({ tag }) => (
                              <span key={tag.id} className="tag">{tag.name}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                );
              })}
            </div>
          </section>
        </div>

        {isEditorOpen && selectedPhoto && (
            <div
                onClick={closeEditor}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.55)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: 24,
                  zIndex: 1000,
                  overflow: 'auto'
                }}
            >
              <section
                  className="card"
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    width: 'min(1100px, calc(100vw - 48px))',
                    maxWidth: 'calc(100vw - 48px)',
                    maxHeight: 'calc(100vh - 48px)',
                    overflow: 'auto',
                    padding: 20
                  }}
              >
                <div
                    className="stack"
                    style={{
                      gap: 16
                    }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0 }}>{isMultiSelection ? `Edit selection (${selectedPhotosCount})` : 'Edit photo'}</h2>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {!isMultiSelection ? (
                          <button
                              type="button"
                              className="secondary"
                              onClick={() => void analyzeSelectedPhoto()}
                              disabled={isAnalyzingPhoto}
                          >
                            {isAnalyzingPhoto ? 'Analyzing…' : 'Analyze photo'}
                          </button>
                      ) : null}
                      <button type="button" className="secondary" onClick={openOriginalImage}>
                        Open original
                      </button>
                      <button type="button" className="secondary" onClick={closeEditor}>
                        Close
                      </button>
                    </div>
                  </div>

                  <div
                      className="card"
                      style={{
                        padding: 12,
                        background: '#0f172a08'
                      }}
                  >
                    <div
                        style={{
                          width: '100%',
                          height: 'min(60vh, 640px)',
                          overflow: 'auto',
                          borderRadius: 8,
                          border: '1px solid #d0d5dd',
                          background: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8
                        }}
                    >
                      <img
                          src={selectedPhoto.imageUrl}
                          alt={selectedPhoto.originalFilename}
                          style={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: 8
                          }}
                      />
                    </div>
                  </div>

                  <div className="small">{selectedPhoto.originalFilename}</div>
                  {isMultiSelection && <div className="small">Multi-selection active. Changes to location apply to all selected photos.</div>}

                  {!isMultiSelection && hasSuggestions(suggestions) ? (
                      <div className="card stack" style={{ gap: 12, padding: 12, background: '#ecfdf3', border: '1px solid #abefc6' }}>
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0 }}>Suggestions</h3>
                          <button type="button" className="secondary" onClick={applyAllSuggestions}>
                            Apply all
                          </button>
                        </div>

                        {suggestions.caption ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Caption</strong>
                                <div className="small">{suggestions.caption}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('caption')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {suggestions.takenAt ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Taken at</strong>
                                <div className="small">{new Date(suggestions.takenAt).toLocaleString()}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('takenAt')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {typeof suggestions.latitude === 'number' ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Latitude</strong>
                                <div className="small">{suggestions.latitude}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('latitude')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {typeof suggestions.longitude === 'number' ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Longitude</strong>
                                <div className="small">{suggestions.longitude}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('longitude')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {suggestions.country ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Country</strong>
                                <div className="small">{suggestions.country}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('country')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {suggestions.placeName ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>Place</strong>
                                <div className="small">{suggestions.placeName}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('placeName')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {suggestions.city ? (
                            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div className="stack" style={{ gap: 4 }}>
                                <strong>City</strong>
                                <div className="small">{suggestions.city}</div>
                              </div>
                              <button type="button" className="secondary" onClick={() => applySuggestionField('city')}>
                                Apply
                              </button>
                            </div>
                        ) : null}

                        {Array.isArray(suggestions.tags) && suggestions.tags.length > 0 ? (
                            <div className="stack" style={{ gap: 8 }}>
                              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <div className="stack" style={{ gap: 4 }}>
                                  <strong>Tags</strong>
                                  <div className="tag-list">
                                    {suggestions.tags.map((tag) => (
                                        <span key={tag} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="row" style={{ gap: 8 }}>
                                  <button type="button" className="secondary" onClick={() => applySuggestionField('tags')}>
                                    Apply to form
                                  </button>
                                  <button type="button" className="secondary" onClick={() => void addSuggestedTags(suggestions.tags ?? [])}>
                                    Add tags
                                  </button>
                                </div>
                              </div>
                            </div>
                        ) : null}
                      </div>
                  ) : null}

                  {!isMultiSelection && suggestions && !hasSuggestions(suggestions) && !isAnalyzingPhoto ? (
                      <div className="small">No missing fields could be suggested for this photo.</div>
                  ) : null}

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

                    <label style={{ width: '100%' }}>
                      Place
                      <LocationAutocomplete
                          label=""
                          value={placeQuery}
                          placeholder="Search a place, museum, landmark, or city"
                          onChange={(value) => {
                            setPlaceQuery(value);
                            setSelectedPhoto({
                              ...selectedPhoto,
                              placeName: value,
                              latitude: null,
                              longitude: null
                            });
                          }}
                          onSelect={applyLocation}
                      />
                    </label>
                  </div>

                  <div className="row">
                    <label style={{ width: '100%' }}>
                      City
                      <input
                          value={selectedPhoto.city ?? ''}
                          onChange={(e) => setSelectedPhoto({ ...selectedPhoto, city: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="row">
                    <button
                        type="button"
                        onClick={() => {
                          if (isMultiSelection) {
                            void saveSelectedPhotosLocation({
                              city: selectedPhoto.city ?? null,
                              country: selectedPhoto.country ?? null,
                              placeName: selectedPhoto.placeName ?? null,
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
                    <button type="button" className="danger" onClick={() => void deletePhoto()} disabled={isMultiSelection}>
                      Delete photo
                    </button>
                  </div>

                  <div className="stack">
                    <h3>Tags</h3>
                    <div className="tag-list">
                      {selectedPhoto.tags.map(({ tag }) => (
                          <span key={tag.id} className="tag">
                      {tag.name}
                            <button type="button" className="danger small-button" onClick={() => void removeTag(tag.name)}>
                        x
                      </button>
                    </span>
                      ))}
                    </div>
                    <div className="row">
                      <input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. panorama" />
                      <button type="button" onClick={() => void addTag()} disabled={isMultiSelection}>
                        Add tag
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
        )}
      </main>
  );
}