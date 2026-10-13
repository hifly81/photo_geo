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
  const onPickLocationRef = useRef(onPickLocation);
  const frameRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    onPickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  function cancelScheduledFrame() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function scheduleMapUpdate(callback: (map: L.Map) => void) {
    cancelScheduledFrame();

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;

      const map = mapRef.current;
      const container = containerRef.current;

      if (!isMountedRef.current || !map || !container || !document.body.contains(container)) {
        return;
      }

      try {
        map.invalidateSize(true);
        callback(map);
      } catch {
        // swallow transient Leaflet timing/layout errors during mount/unmount races
      }
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    isMountedRef.current = true;

    const map = L.map(containerRef.current).setView([41.9, 12.5], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    const handleClick = (event: L.LeafletMouseEvent) => {
      onPickLocationRef.current(event.latlng.lat, event.latlng.lng);
    };

    map.on('click', handleClick);

    const resizeObserver = new ResizeObserver(() => {
      scheduleMapUpdate(() => {
        // invalidate only
      });
    });

    resizeObserver.observe(containerRef.current);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      isMountedRef.current = false;
      cancelScheduledFrame();
      resizeObserver.disconnect();

      if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }

      markersLayer.clearLayers();
      map.off('click', handleClick);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !markersLayer) return;

    cancelScheduledFrame();
    markersLayer.clearLayers();

    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    const geolocated = photos.filter(
        (photo) => photo.latitude !== null && photo.longitude !== null
    );

    const latLngs: L.LatLngExpression[] = [];

    for (const photo of geolocated) {
      const latLng: L.LatLngExpression = [photo.latitude as number, photo.longitude as number];
      latLngs.push(latLng);

      const marker = L.marker(latLng);
      marker.bindPopup(photo.originalFilename);
      marker.on('click', () => onSelectPhoto(photo));
      marker.addTo(markersLayer);
    }

    if (selectedPhoto && selectedPhoto.latitude !== null && selectedPhoto.longitude !== null) {
      const selectedLatLng: L.LatLngExpression = [
        selectedPhoto.latitude,
        selectedPhoto.longitude
      ];

      selectedMarkerRef.current = L.marker(selectedLatLng)
          .bindPopup('Selected photo position')
          .addTo(map);

      scheduleMapUpdate((currentMap) => {
        currentMap.setView(selectedLatLng, Math.max(currentMap.getZoom(), 10), { animate: false });
      });

      return;
    }

    if (latLngs.length === 1) {
      scheduleMapUpdate((currentMap) => {
        currentMap.setView(latLngs[0], 10, { animate: false });
      });

      return;
    }

    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);

      scheduleMapUpdate((currentMap) => {
        currentMap.fitBounds(bounds, { padding: [24, 24], animate: false });
      });
    }
  }, [photos, selectedPhoto, onSelectPhoto]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}