import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load Google Maps script with the correct libraries
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
    // Important: Add 'places' library for Places API (New)
    // Add 'geocoding' for reverse geocoding if needed
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * AddressAutocomplete using Google Places API (New)
 * Uses the modern PlaceAutocompleteElement
 */
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
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(!!window.google?.maps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load script on mount
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

  // Initialize PlaceAutocompleteElement
  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.google?.maps) return;

    try {
      // Clear container first
      containerRef.current.innerHTML = '';

      // Create the PlaceAutocompleteElement (modern API)
      const autocompleteElement = document.createElement('gmp-place-autocomplete');
      
      // Set attributes
      autocompleteElement.setAttribute('country', 'za');
      autocompleteElement.setAttribute('placeholder', placeholder);
      autocompleteElement.setAttribute('style', 'width: 100%;');
      
      // Add class for styling
      autocompleteElement.className = `w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background ${inputClassName}`;

      // Set initial value if present
      if (value) {
        autocompleteElement.value = value;
      }

      // Handle place selection
      autocompleteElement.addEventListener('gmp-placeselect', (event) => {
        const place = event.detail.place;
        if (!place?.formattedAddress) return;

        const lat = place.location?.lat() ?? null;
        const lng = place.location?.lng() ?? null;

        console.log('📍 Address selected:', place.formattedAddress);
        onChange?.(place.formattedAddress);
        onSelect?.(place.formattedAddress, { 
          lat, 
          lng, 
          placeId: place.id,
          name: place.name,
          addressComponents: place.addressComponents
        });
      });

      // Handle input changes
      autocompleteElement.addEventListener('input', (event) => {
        const target = event.target;
        if (target?.value !== undefined) {
          onChange?.(target.value);
        }
      });

      // Append to container
      containerRef.current.appendChild(autocompleteElement);
      inputRef.current = autocompleteElement;

      console.log('✅ PlaceAutocompleteElement initialized with Places API (New)');

    } catch (err) {
      console.error('Failed to initialize PlaceAutocompleteElement:', err);
      setError('Address search is unavailable');
      
      // Fallback: Create a manual input with map link
      const fallbackInput = document.createElement('input');
      fallbackInput.type = 'text';
      fallbackInput.placeholder = placeholder;
      fallbackInput.value = value || '';
      fallbackInput.className = `w-full pl-9 pr-3 py-2 text-sm rounded-md border border-yellow-300 bg-yellow-50 ${inputClassName}`;
      fallbackInput.disabled = disabled;
      
      fallbackInput.addEventListener('input', (e) => {
        onChange?.(e.target.value);
      });
      
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(fallbackInput);
      inputRef.current = fallbackInput;
      
      // Add a map button
      const mapButton = document.createElement('button');
      mapButton.type = 'button';
      mapButton.className = 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:text-blue-700 underline z-10 bg-transparent px-2';
      mapButton.textContent = 'Map';
      mapButton.onclick = () => {
        if (value) {
          window.open(`https://maps.google.com/?q=${encodeURIComponent(value)}`, '_blank');
        }
      };
      containerRef.current.parentElement?.appendChild(mapButton);
    }
  }, [scriptReady]);

  // Update value when it changes externally
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

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
      <div ref={containerRef} className="w-full">
        {/* PlaceAutocompleteElement will be rendered here */}
      </div>
      {loading && (
        <p className="text-xs text-gray-400 mt-1">Loading address suggestions...</p>
      )}
      {required && !value && (
        <p className="text-xs text-red-500 mt-1">Address is required</p>
      )}
    </div>
  );
}