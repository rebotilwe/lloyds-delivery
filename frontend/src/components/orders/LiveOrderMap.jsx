import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

let L = null;

export default function LiveOrderMap({ driverLocation, restaurantLocation, deliveryLocation, orderStatus }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!L && typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        setMapLoaded(true);
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapContainerRef.current && !mapRef.current) {
      // Default center (Verulam, SA)
      mapRef.current = L.map(mapContainerRef.current).setView([-29.65, 31.05], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !L || !mapLoaded) return;

    // Clear existing markers
    if (driverMarkerRef.current) driverMarkerRef.current.remove();

    // Add driver marker if location available and order is active
    if (driverLocation?.lat && driverLocation?.lng && orderStatus !== 'delivered' && orderStatus !== 'cancelled') {
      const driverIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); animation: pulse 1.5s infinite;"><span style="font-size: 18px;">🚚</span></div>`,
        iconSize: [32, 32],
        popupAnchor: [0, -15]
      });
      
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Driver</b><br>Your delivery is on the way!')
        .openPopup();

      // Center map on driver
      mapRef.current.setView([driverLocation.lat, driverLocation.lng], 14);
    }
  }, [driverLocation, orderStatus, L, mapLoaded]);

  if (!mapLoaded) {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
        <span className="ml-2 text-gray-500">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-64 md:h-80 rounded-xl overflow-hidden border shadow-lg"
      />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}