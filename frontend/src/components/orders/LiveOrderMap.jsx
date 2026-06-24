import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Google Maps script loader
function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    if (document.getElementById('google-maps-script')) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function LiveOrderMap({ 
  driverLocation, 
  restaurantLocation, 
  deliveryLocation, 
  orderStatus 
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(true);
      setMapLoading(false);
      return;
    }
    
    if (window.google?.maps) {
      setMapReady(true);
      setMapLoading(false);
      return;
    }
    
    loadGoogleMapsScript()
      .then(() => {
        setMapReady(true);
        setMapLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setMapLoading(false);
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    // Default center (Durban)
    const defaultCenter = { lat: -29.8587, lng: 31.0218 };
    
    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 13,
      center: defaultCenter,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#22c55e', strokeWeight: 4, strokeOpacity: 0.8 },
    });
    directionsRendererRef.current.setMap(mapRef.current);

    return () => {
      mapRef.current = null;
      driverMarkerRef.current = null;
      restaurantMarkerRef.current = null;
      deliveryMarkerRef.current = null;
    };
  }, [mapReady]);

  // Update markers and directions
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
      driverMarkerRef.current = null;
    }
    if (restaurantMarkerRef.current) {
      restaurantMarkerRef.current.setMap(null);
      restaurantMarkerRef.current = null;
    }
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setMap(null);
      deliveryMarkerRef.current = null;
    }

    // Show delivery location marker
    if (deliveryLocation) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: deliveryLocation }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const destPos = results[0].geometry.location;
          deliveryMarkerRef.current = new window.google.maps.Marker({
            position: destPos,
            map: mapRef.current,
            title: 'Delivery Address',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#dc2626" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="16">📍</text></svg>'
              ),
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 18),
            },
          });
        }
      });
    }

    // Show restaurant marker
    if (restaurantLocation) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: restaurantLocation }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const restPos = results[0].geometry.location;
          restaurantMarkerRef.current = new window.google.maps.Marker({
            position: restPos,
            map: mapRef.current,
            title: 'Restaurant',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#f59e0b" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="16">🍽️</text></svg>'
              ),
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 18),
            },
          });
        }
      });
    }

    // Show driver marker and route
    if (driverLocation?.lat && driverLocation?.lng && orderStatus !== 'delivered' && orderStatus !== 'cancelled') {
      const driverPos = { lat: driverLocation.lat, lng: driverLocation.lng };
      
      driverMarkerRef.current = new window.google.maps.Marker({
        position: driverPos,
        map: mapRef.current,
        title: 'Your Driver',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#22c55e" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="18">🚚</text></svg>'
          ),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        },
      });

      mapRef.current.panTo(driverPos);

      // Show route to delivery if delivery location is available
      if (deliveryLocation) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: deliveryLocation }, (results, status) => {
          if (status === 'OK' && results[0] && directionsRendererRef.current) {
            const destPos = results[0].geometry.location;
            
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route(
              { origin: driverPos, destination: destPos, travelMode: window.google.maps.TravelMode.DRIVING },
              (result, routeStatus) => {
                if (routeStatus === 'OK' && directionsRendererRef.current) {
                  directionsRendererRef.current.setDirections(result);
                }
              }
            );

            // Fit bounds to show both driver and destination
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(destPos);
            mapRef.current.fitBounds(bounds, { padding: 60 });
          }
        });
      }
    }

    // If driver location is not available but we have delivery location, center on delivery
    if (!driverLocation?.lat && deliveryLocation) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: deliveryLocation }, (results, status) => {
        if (status === 'OK' && results[0]) {
          mapRef.current.setCenter(results[0].geometry.location);
          mapRef.current.setZoom(14);
        }
      });
    }
  }, [driverLocation, restaurantLocation, deliveryLocation, orderStatus, mapReady]);

  // Handle loading state
  if (mapLoading) {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading map...</span>
      </div>
    );
  }

  // Handle error state
  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Map is unavailable</p>
          {deliveryLocation && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700"
              onClick={() => {
                window.open(`https://maps.google.com/?q=${encodeURIComponent(deliveryLocation)}`, '_blank');
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Open in Google Maps
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show waiting for driver location
  if (!driverLocation?.lat && orderStatus !== 'delivered' && orderStatus !== 'cancelled') {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
        <p className="text-sm text-gray-500">Waiting for driver location...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-64 md:h-80 rounded-xl overflow-hidden border shadow-lg"
      />
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
        <span className="text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-full">
          Powered by Google Maps
        </span>
      </div>
    </div>
  );
}