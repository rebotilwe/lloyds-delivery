import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function waitForAutocomplete(timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (typeof window.google?.maps?.places?.Autocomplete === 'function') {
      resolve();
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      if (typeof window.google?.maps?.places?.Autocomplete === 'function') {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(id);
        reject(new Error('Timed out waiting for Google Places Autocomplete'));
      }
    }, 150);
  });
}

let scriptPromise = null;

function loadGoogleMapsScript() {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window.google?.maps?.places?.Autocomplete === 'function') {
      resolve();
      return;
    }
    if (document.getElementById('google-maps-script')) {
      waitForAutocomplete().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForAutocomplete().then(resolve).catch(reject);
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter address',
  className = '',
  inputClassName = '',
  disabled = false,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIX: keep the latest onChange/onSelect in refs so the Google listener
  // (created once per input) always calls the current handler instead of
  // a stale one captured at mount time. This was the cause of typing in
  // the delivery field wiping out the pickup field's state.
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('API key missing');
      setLoading(false);
      return;
    }

    loadGoogleMapsScript()
      .then(() => { setReady(true); setLoading(false); })
      .catch((err) => { console.error(err); setError('Address suggestions unavailable'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const instance = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'za' },
      fields: ['formatted_address', 'geometry', 'place_id'],
      types: ['address'],
    });
    autocompleteRef.current = instance;

    instance.addListener('place_changed', () => {
      const place = instance.getPlace();
      if (!place?.formatted_address) return;
      const lat = place.geometry?.location?.lat() ?? null;
      const lng = place.geometry?.location?.lng() ?? null;

      // Always call the CURRENT handler via ref, never a stale closure
      onChangeRef.current?.(place.formatted_address);
      onSelectRef.current?.(place.formatted_address, { lat, lng, placeId: place.place_id });
    });

    return () => {
      try { window.google.maps.event.clearInstanceListeners(instance); } catch {}
      autocompleteRef.current = null;
    };
  }, [ready]);

  const inputClass = `
    w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input
    bg-background ring-offset-background placeholder:text-muted-foreground
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    ${inputClassName}
  `;

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full pl-9 pr-3 py-2 text-sm rounded-md border border-yellow-300 bg-yellow-50 placeholder:text-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${inputClassName}`}
        />
        <p className="text-xs text-yellow-600 mt-1">Suggestions unavailable — type address manually</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        {loading
          ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          : <MapPin className="w-4 h-4 text-gray-400" />}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled || loading}
        autoComplete="off"
        className={inputClass}
      />
      {!loading && ready && (
        <p className="text-[10px] text-gray-400 mt-0.5">Start typing for South African address suggestions</p>
      )}
    </div>
  );
}