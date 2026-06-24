import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Star, Clock, Bike, MapPin, ShoppingBag, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import MenuItemCard from '@/components/restaurants/MenuItemCard';
import { useCart } from '@/lib/cartStore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Restaurant Map Component
function RestaurantMap({ address, name }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(true);
      return;
    }
    if (window.google?.maps) {
      setMapReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('google-maps-script');
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 15,
      center: { lat: -29.8587, lng: 31.0218 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const pos = results[0].geometry.location;
        markerRef.current = new window.google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#f59e0b" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="18">🍽️</text></svg>'
            ),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
        });
        mapRef.current.setCenter(pos);
        mapRef.current.setZoom(15);
      }
    });
  }, [mapReady, address, name]);

  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Open in Maps
        </Button>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} className="w-full h-48 rounded-lg overflow-hidden border" />
  );
}

export default function RestaurantDetail() {
  const { id } = useParams();
  const restaurantId = Number(id);

  const { cart, getTotalItems, getTotalPrice } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const { data: restaurant, isLoading: loadingRest } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      const res = await base44.entities.Restaurant.filter({ id: restaurantId });
      return res?.[0] || null;
    },
    enabled: !!restaurantId,
  });

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: () => base44.entities.MenuItem.filter({ restaurant_id: restaurantId }),
    enabled: !!restaurantId,
  });

  const categories = useMemo(() => {
    const set = new Set(menuItems.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return menuItems;
    return menuItems.filter(i => i.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  if (loadingRest || loadingMenu) {
    return (
      <div className="pb-28">
        <Skeleton className="h-48 md:h-64 w-full" />
        <div className="px-4 py-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-gray-500">Restaurant not found</p>
        <Link to="/">
          <Button className="mt-4">Back to Home</Button>
        </Link>
      </div>
    );
  }

  const showCartBar = getTotalItems() > 0 && cart.restaurantId === restaurantId;

  return (
    <div className="pb-28">
      {/* Hero Image */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop'} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="bg-black/50 text-white hover:bg-black/70">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        <h1 className="text-xl md:text-3xl font-bold">{restaurant.name}</h1>
        <p className="text-gray-500 text-sm mt-1">{restaurant.description}</p>
        
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
          {restaurant.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {restaurant.rating}
            </span>
          )}
          {restaurant.estimated_delivery_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {restaurant.estimated_delivery_time}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bike className="w-4 h-4" />
            R{restaurant.delivery_fee || 15} delivery
          </span>
        </div>
      </div>

      {/* Map Section - Google Maps Integration */}
      {restaurant.address && (
        <div className="max-w-5xl mx-auto px-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Location
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`, '_blank')}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </div>
              <RestaurantMap address={restaurant.address} name={restaurant.name} />
              <p className="text-sm text-gray-600 mt-2">{restaurant.address}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Filters - Responsive */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`shrink-0 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition whitespace-nowrap ${
                  selectedCategory === c
                    ? 'bg-navy text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {filteredItems.map(item => (
              <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Cart Bar - Mobile Optimized */}
      {showCartBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 md:p-4 bg-white border-t shadow-lg">
          <div className="max-w-5xl mx-auto">
            <Link to="/cart">
              <Button className="w-full h-10 md:h-12 bg-green hover:bg-green/600 text-white text-sm md:text-base font-bold rounded-xl shadow-lg">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                View Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})
                <span className="ml-auto font-bold">R{getTotalPrice().toFixed(2)}</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}