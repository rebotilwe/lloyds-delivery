import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

// Use the env var with a fallback
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBON7MrLqDdb3KxNJwcO0cnWoCsfQEC4nM';

console.log('🔑 Using API key:', GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'NOT SET');

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
    // Use the legacy API with places library
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter address',
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(!!window.google?.maps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is not configured');
      console.warn('AddressAutocomplete: VITE_GOOGLE_MAPS_API_KEY is not set');
      return;
    }
    if (scriptReady) return;

    setLoading(true);
    loadGoogleMapsScript()
      .then(() => {
        setScriptReady(true);
        setError(null);
        console.log('✅ Google Maps script loaded');
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load address suggestions');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!scriptReady || !inputRef.current || autocompleteRef.current) return;

    try {
      console.log('🔧 Initializing Google Places Autocomplete...');
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'za' },
        fields: ['formatted_address', 'geometry', 'place_id'],
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place?.formatted_address) return;
        
        const lat = place.geometry?.location?.lat() ?? null;
        const lng = place.geometry?.location?.lng() ?? null;
        
        console.log('📍 Address selected:', place.formatted_address);
        
        onChange?.(place.formatted_address);
        onSelect?.(place.formatted_address, { 
          lat, 
          lng, 
          placeId: place.place_id 
        });
      });

      console.log('✅ Google Places Autocomplete initialized successfully');

    } catch (err) {
      console.error('Failed to initialize autocomplete:', err);
      setError('Address search unavailable');
    }
  }, [scriptReady]);

  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {}
        autocompleteRef.current = null;
      }
    };
  }, []);

  // Handle error state with manual input
  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`
            w-full pl-9 pr-16 py-2 text-sm rounded-md border border-yellow-300
            bg-yellow-50 ring-offset-background
            placeholder:text-yellow-600
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${inputClassName}
          `}
        />
        <button
          type="button"
          onClick={() => {
            if (value) {
              window.open(`https://maps.google.com/?q=${encodeURIComponent(value)}`, '_blank');
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:text-blue-700 underline z-10 bg-transparent px-2 py-1"
        >
          Map
        </button>
        <p className="text-xs text-yellow-600 mt-1">
          {!GOOGLE_MAPS_API_KEY ? 'API key not configured' : 'Manual entry - click Map to verify'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        {loading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        autoComplete="off"
        className={`
          w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input
          bg-background ring-offset-background
          placeholder:text-muted-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${inputClassName}
        `}
      />
      {loading && (
        <p className="text-xs text-gray-400 mt-1">Loading address suggestions...</p>
      )}
      {required && !value && (
        <p className="text-xs text-red-500 mt-1">Address is required</p>
      )}
      {/* Small hint that autocomplete is active */}
      {!loading && !error && scriptReady && (
        <p className="text-[10px] text-gray-400 mt-0.5">Type to see address suggestions</p>
      )}
    </div>
  );
}