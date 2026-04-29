import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, MapPin, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantCard from '@/components/restaurants/RestaurantCard';

const cuisineFilters = ['All', 'Fast Food', 'Pizza', 'Burgers', 'Sushi', 'Chinese', 'Indian', 'Mexican', 'Italian', 'Healthy', 'Desserts'];

export default function Home() {
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => base44.entities.Restaurant.filter({ is_active: true }),
  });

  const filtered = restaurants.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCuisine = activeCuisine === 'All' || r.cuisine_type === activeCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground leading-tight">
              Food delivered
              <span className="text-secondary"> to your door</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/70">
              Order from the best restaurants near you. Fast, reliable delivery by Lloyd's.
            </p>
            <div className="mt-8 flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants or cuisines..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-12 bg-white text-foreground border-0 shadow-lg rounded-xl"
                />
              </div>
              <Button className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl shadow-lg">
                <MapPin className="w-4 h-4 mr-2" />
                Near me
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {cuisineFilters.map(c => (
            <Button
              key={c}
              variant={activeCuisine === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCuisine(c)}
              className={`rounded-full shrink-0 ${
                activeCuisine === c
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-primary/5'
              }`}
            >
              {c}
            </Button>
          ))}
        </div>
      </section>

      {/* Restaurant grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {activeCuisine === 'All' ? 'All Restaurants' : activeCuisine}
          </h2>
          <span className="text-sm text-muted-foreground">{filtered.length} places</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No restaurants found</p>
            <p className="text-sm text-muted-foreground mt-1">Try changing your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(r => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}