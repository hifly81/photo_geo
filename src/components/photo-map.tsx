'use client';

import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { PhotoRecord } from '@/types/photo';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function MapClickHandler({ onPickLocation }: { onPickLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

export function PhotoMap({
  photos,
  selectedPhoto,
  onSelectPhoto,
  onPickLocation
}: {
  photos: PhotoRecord[];
  selectedPhoto: PhotoRecord | null;
  onSelectPhoto: (photo: PhotoRecord) => void;
  onPickLocation: (lat: number, lng: number) => void;
}) {
  const geolocated = photos.filter((photo) => photo.latitude !== null && photo.longitude !== null);

  return (
    <MapContainer center={[41.9, 12.5]} zoom={4} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {selectedPhoto && <MapClickHandler onPickLocation={onPickLocation} />}
      {geolocated.map((photo) => (
        <Marker key={photo.id} position={[photo.latitude as number, photo.longitude as number]} eventHandlers={{ click: () => onSelectPhoto(photo) }}>
          <Popup>{photo.originalFilename}</Popup>
        </Marker>
      ))}
      {selectedPhoto?.latitude !== null && selectedPhoto?.longitude !== null && (
        <Marker position={[selectedPhoto.latitude, selectedPhoto.longitude]}>
          <Popup>Selected photo position</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
