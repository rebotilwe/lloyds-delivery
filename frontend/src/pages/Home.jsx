import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, MapPin, Package, FileText, Truck, ShoppingBag, Navigation, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import RestaurantCard from '@/components/restaurants/RestaurantCard';

const API_URL = import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com/api';

const cuisineFilters = [
  'All', 'Kotas', 'Burgers', 'Pizzas', 'Sushi', 'Fast Food',
  'Chinese', 'Indian', 'Mexican', 'Italian', 'Healthy', 'Desserts'
];

// Delivery Type Options
const deliveryTypes = [
  { id: 'food', label: '🍔 Food Delivery', icon: ShoppingBag, description: 'Restaurant food delivery', color: 'bg-green' },
  { id: 'package', label: '📦 Package Delivery', icon: Package, description: 'Parcels, gifts, small packages', color: 'bg-blue-500' },
  { id: 'document', label: '📄 Document Delivery', icon: FileText, description: 'Letters, contracts, documents', color: 'bg-purple-500' },
  { id: 'other', label: '🚚 Other', icon: Truck, description: 'Anything else you need delivered', color: 'bg-orange-500' },
];

// ── DISTANCE MATRIX — goes through our backend proxy (real driving distance/ETA) ──
// Falls back to null on failure; caller should fall back to Haversine in that case.
async function getDistanceMatrix(originLat, originLng, destinationAddress) {
  if (!originLat || !originLng || !destinationAddress) return null;

  try {
    const url =
      `${API_URL}/orders/maps/distance-matrix?` +
      `originLat=${encodeURIComponent(originLat)}&` +
      `originLng=${encodeURIComponent(originLng)}&` +
      `destination=${encodeURIComponent(destinationAddress)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.result) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error('Distance Matrix proxy error:', err);
    return null;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState('food');
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'distance', 'rating'
  const [distanceCache, setDistanceCache] = useState({}); // restaurantId -> { distance, distanceText, durationText }
  const [loadingDistances, setLoadingDistances] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: restaurants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => base44.entities.Restaurant.list(),
  });

  // Get user location for "Near me" feature
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        toast.success('Location detected! Showing nearby restaurants');
        setGettingLocation(false);
        setSortBy('distance');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to get your location. Please enable location services.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Calculate distance between two coordinates (Haversine formula) — fallback only
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ── Fetch real driving distances via backend proxy once we have user location ──
  useEffect(() => {
    if (!userLocation?.lat || !userLocation?.lng || restaurants.length === 0) return;

    let cancelled = false;

    const fetchAllDistances = async () => {
      setLoadingDistances(true);
      const newCache = {};

      for (const r of restaurants) {
        if (cancelled) return;

        // Prefer real address if the restaurant has one, otherwise fall back
        // to raw coordinates formatted as a string the Distance Matrix API accepts.
        const destination = r.address || (
          r.latitude && r.longitude ? `${r.latitude},${r.longitude}` : null
        );
        if (!destination) continue;

        const result = await getDistanceMatrix(userLocation.lat, userLocation.lng, destination);

        if (result) {
          newCache[r.id] = {
            distance: result.distance,
            distanceText: result.distanceText,
            durationText: result.durationText,
          };
        } else {
          // Fallback to Haversine straight-line distance
          const fallback = calculateDistance(
            userLocation.lat, userLocation.lng,
            r.latitude || -29.8587, r.longitude || 31.0218
          );
          if (fallback !== null) {
            newCache[r.id] = {
              distance: fallback,
              distanceText: `${fallback.toFixed(1)} km`,
              durationText: null,
            };
          }
        }
      }

      if (!cancelled) {
        setDistanceCache(newCache);
        setLoadingDistances(false);
      }
    };

    fetchAllDistances();

    return () => { cancelled = true; };
  }, [userLocation, restaurants]);

  // Filter and sort restaurants
  const filteredAndSorted = useMemo(() => {
    if (!restaurants.length) return [];
    
    // First apply filters
    let filtered = restaurants.filter(r => {
      const matchesSearch = !debouncedSearch ||
        r.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesCuisine = activeCuisine === 'All' || r.cuisine_type === activeCuisine;
      return matchesSearch && matchesCuisine;
    });

    // Then sort
    if (sortBy === 'distance' && userLocation) {
      filtered = filtered
        .map(r => ({
          ...r,
          distance: distanceCache[r.id]?.distance ?? null,
          distanceText: distanceCache[r.id]?.distanceText ?? null,
          durationText: distanceCache[r.id]?.durationText ?? null,
        }))
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    } else if (sortBy === 'rating') {
      filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    
    return filtered;
  }, [restaurants, debouncedSearch, activeCuisine, sortBy, userLocation, distanceCache]);

  const visibleFilters = showAllFilters ? cuisineFilters : cuisineFilters.slice(0, 6);

  const handleDeliveryTypeSelect = (type) => {
    setSelectedDeliveryType(type);
    if (type !== 'food') {
      navigate('/package-delivery', { state: { deliveryType: type } });
    }
  };

  const openGoogleMaps = (address) => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
  };

  if (error) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-red-500">Error loading restaurants. Please try again later.</p>
        <Button onClick={() => refetch()} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Hero Section - Mobile Optimized */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-48 h-48 md:w-96 md:h-96 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 md:w-72 md:h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              Fast delivery
              <span className="text-green block md:inline"> for everything</span>
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-lg text-white/70">
              Food, packages, documents - we deliver it all. Fast, reliable, and affordable.
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <Input
                  placeholder="Search restaurants..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 md:pl-10 h-10 md:h-12 bg-white border-0 shadow-lg rounded-xl text-sm md:text-base"
                />
              </div>
              <Button 
                className="h-10 md:h-12 px-4 md:px-6 bg-green hover:bg-green/90 text-white rounded-xl shadow-sm text-sm md:text-base flex items-center gap-2 whitespace-nowrap"
                onClick={getUserLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {gettingLocation ? 'Detecting...' : 'Near me'}
              </Button>
            </div>
            {userLocation && (
              <p className="text-xs text-white/50 mt-2">
                📍 Location detected - showing nearby restaurants
                {loadingDistances && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> calculating driving distances...
                  </span>
                )}
                <button 
                  onClick={() => setSortBy('distance')}
                  className="ml-2 text-green-400 hover:text-green-300 underline"
                >
                  Sort by distance
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Delivery Type Cards */}
      <section className="max-w-7xl mx-auto px-4 pt-6 md:pt-8">
        <h2 className="text-sm md:text-base font-semibold mb-3">What would you like to deliver?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {deliveryTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedDeliveryType === type.id ? 'ring-2 ring-green shadow-md' : ''
                }`}
                onClick={() => handleDeliveryTypeSelect(type.id)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`w-10 h-10 mx-auto rounded-full ${type.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-xs sm:text-sm">{type.label}</p>
                  <p className="text-[10px] text-gray-500 mt-1 hidden sm:block">{type.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Cuisine Filters - Only show for food delivery */}
      {selectedDeliveryType === 'food' && (
        <section className="max-w-7xl mx-auto px-4 pt-6 md:pt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-semibold">Browse by Cuisine</h2>
            <div className="flex items-center gap-2">
              {userLocation && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-xs ${sortBy === 'distance' ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                  onClick={() => setSortBy(sortBy === 'distance' ? 'relevance' : 'distance')}
                >
                  {sortBy === 'distance' ? '📍 Distance' : 'Sort by Distance'}
                </Button>
              )}
              <button
                onClick={() => setShowAllFilters(!showAllFilters)}
                className="text-xs text-green md:hidden"
              >
                {showAllFilters ? 'Show Less' : `+${cuisineFilters.length - 6} more`}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleFilters.map(c => (
              <Button
                key={c}
                variant={activeCuisine === c ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCuisine(c)}
                className={`rounded-full text-xs md:text-sm px-3 md:px-4 py-1 h-auto ${
                  activeCuisine === c
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Restaurants Grid - Only show for food delivery */}
      {selectedDeliveryType === 'food' && (
        <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">
              {activeCuisine === 'All' ? 'All Restaurants' : activeCuisine}
            </h2>
            <span className="text-xs md:text-sm text-gray-500">
              {filteredAndSorted.length} places
              {userLocation && sortBy === 'distance' && ' • Sorted by driving distance'}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <div className="p-3 md:p-4 space-y-2">
                    <Skeleton className="h-4 md:h-5 w-3/4" />
                    <Skeleton className="h-3 md:h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <p className="text-base md:text-lg font-semibold">No restaurants found</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredAndSorted.map(r => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  distanceText={sortBy === 'distance' ? distanceCache[r.id]?.distanceText : null}
                  durationText={sortBy === 'distance' ? distanceCache[r.id]?.durationText : null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Package Delivery Info - Show when non-food is selected */}
      {selectedDeliveryType !== 'food' && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green/20 flex items-center justify-center mb-4">
                <Truck className="w-8 h-8 text-green" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {deliveryTypes.find(t => t.id === selectedDeliveryType)?.label}
              </h3>
              <p className="text-gray-600 mb-4">
                Fast and reliable delivery for all your needs. 
                Get a quote in seconds and track your delivery in real-time.
              </p>
              <Button 
                onClick={() => navigate('/package-delivery', { state: { deliveryType: selectedDeliveryType } })}
                className="bg-green text-white"
              >
                Continue to Quote
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}