import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Star, Clock, Bike, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import MenuItemCard from '@/components/restaurants/MenuItemCard';
import { useCart } from '@/lib/cartStore';

export default function RestaurantDetail() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const { cart, getTotalItems, getTotalPrice } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: restaurant, isLoading: loadingRest } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: async () => {
      const restaurants = await base44.entities.Restaurant.filter({ id: parseInt(id) });
      return restaurants[0];
    },
    enabled: !!id,
  });

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menuItems', id],
    queryFn: () => base44.entities.MenuItem.filter({ restaurant_id: parseInt(id) }),
    enabled: !!id,
  });

  // Get unique categories
  const categories = ['All', ...new Set(menuItems.map(item => item.category).filter(Boolean))];
  
  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  if (loadingRest || loadingMenu) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Restaurant not found</p>
        <Link to="/">
          <Button variant="link" className="mt-4">Back to restaurants</Button>
        </Link>
      </div>
    );
  }

  const showCartBar = getTotalItems() > 0 && cart.restaurantId === parseInt(id);

  return (
    <div className="pb-28">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-white/80 mt-1 text-sm">{restaurant.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-white/90 text-sm">
            {restaurant.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
              </span>
            )}
            {restaurant.estimated_delivery_time && (
              <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5">
                <Clock className="w-3.5 h-3.5" /> {restaurant.estimated_delivery_time}
              </span>
            )}
            <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5">
              <Bike className="w-3.5 h-3.5" /> R{(restaurant.delivery_fee || 0).toFixed(0)} delivery
            </span>
            {restaurant.address && (
              <span className="flex items-center gap-1 text-white/70">
                <MapPin className="w-3.5 h-3.5" /> {restaurant.address}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {categories.length > 1 && (
        <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-navy text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No menu items available in this category
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Cart Bar */}
      {showCartBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-white border-t shadow-2xl">
          <div className="max-w-5xl mx-auto">
            <Link to="/cart">
              <Button className="w-full h-14 bg-green hover:bg-green/600 text-white text-base font-bold rounded-xl shadow-lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
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