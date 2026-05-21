import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantCard from '@/components/restaurants/RestaurantCard';

const cuisineFilters = [
  'All', 'Kotas', 'Burgers', 'Pizzas', 'Sushi', 'Fast Food',
  'Chinese', 'Indian', 'Mexican', 'Italian', 'Healthy', 'Desserts'
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [showAllFilters, setShowAllFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: restaurants = [], isLoading, error } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => base44.entities.Restaurant.list(),
  });

  const filtered = useMemo(() => {
    if (!restaurants.length) return [];
    return restaurants.filter(r => {
      const matchesSearch = !debouncedSearch ||
        r.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesCuisine = activeCuisine === 'All' || r.cuisine_type === activeCuisine;
      return matchesSearch && matchesCuisine;
    });
  }, [restaurants, debouncedSearch, activeCuisine]);

  const visibleFilters = showAllFilters ? cuisineFilters : cuisineFilters.slice(0, 6);

  if (error) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-red-500">Error loading restaurants. Please try again later.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
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
              Food delivered
              <span className="text-green block md:inline"> to your door</span>
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-lg text-white/70">
              Order from the best restaurants near you. Fast, reliable delivery by Lloyd's.
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
              <Button className="h-10 md:h-12 px-4 md:px-6 bg-green hover:bg-green/90 text-white rounded-xl shadow-sm text-sm md:text-base">
                <MapPin className="w-4 h-4 mr-1 md:mr-2" />
                Near me
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Filters - Mobile Friendly */}
      <section className="max-w-7xl mx-auto px-4 pt-6 md:pt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-semibold">Browse by Cuisine</h2>
          <button
            onClick={() => setShowAllFilters(!showAllFilters)}
            className="text-xs text-green md:hidden"
          >
            {showAllFilters ? 'Show Less' : `+${cuisineFilters.length - 6} more`}
          </button>
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

      {/* Restaurants Grid - Responsive */}
      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">
            {activeCuisine === 'All' ? 'All Restaurants' : activeCuisine}
          </h2>
          <span className="text-xs md:text-sm text-gray-500">{filtered.length} places</span>
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <p className="text-base md:text-lg font-semibold">No restaurants found</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filtered.map(r => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}