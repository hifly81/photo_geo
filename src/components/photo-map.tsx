'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PhotoRecord } from '@/types/photo';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([41.9, 12.5], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    map.on('click', (event) => {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      markersLayer.clearLayers();
      map.off();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      selectedMarkerRef.current = null;
    };
  }, [onPickLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const geolocated = photos.filter(
      (photo) => photo.latitude !== null && photo.longitude !== null
    );

    geolocated.forEach((photo) => {
      const marker = L.marker([photo.latitude as number, photo.longitude as number]);
      marker.bindPopup(photo.originalFilename);
      marker.on('click', () => onSelectPhoto(photo));
      marker.addTo(markersLayer);
    });

    if (selectedPhoto && selectedPhoto.latitude !== null && selectedPhoto.longitude !== null) {
      selectedMarkerRef.current = L.marker([selectedPhoto.latitude, selectedPhoto.longitude])
        .bindPopup('Selected photo position')
        .addTo(map);
    } else {
      selectedMarkerRef.current = null;
    }
  }, [photos, selectedPhoto, onSelectPhoto]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
