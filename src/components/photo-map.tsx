'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

type Photo = {
  id: string;
  originalFilename: string;
  latitude: number | null;
  longitude: number | null;
};

export function PhotoMap({
  photos,
  onSelectPhoto
}: {
  photos: Photo[];
  onSelectPhoto: (photo: Photo) => void;
}) {
  const geolocated = photos.filter((photo) => photo.latitude !== null && photo.longitude !== null);

  return (
    <MapContainer center={[41.9, 12.5]} zoom={4} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geolocated.map((photo) => (
        <Marker key={photo.id} position={[photo.latitude as number, photo.longitude as number]} eventHandlers={{ click: () => onSelectPhoto(photo) }}>
          <Popup>{photo.originalFilename}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
