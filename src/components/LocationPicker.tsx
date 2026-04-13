import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in Leaflet using CDN links
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: [number, number];
}

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialLocation || [33.3152, 44.3661]); // Default to Baghdad

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
    } else {
      // Try to get user's current location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          onLocationSelect(newPos[0], newPos[1]);
        },
        () => {
          console.log("Geolocation not available");
        }
      );
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative">
      <MapContainer 
        center={position} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position} />
        <MapEvents onLocationSelect={handleMapClick} />
        <ChangeView center={position} />
      </MapContainer>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-gray-700 pointer-events-none">
        اضغط على الخريطة لتحديد موقعك
      </div>
    </div>
  );
}
