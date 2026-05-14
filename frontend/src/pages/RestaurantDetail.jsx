import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Star, Clock, Bike, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import MenuItemCard from '@/components/restaurants/MenuItemCard';
import { useCart } from '@/lib/cartStore';

export default function RestaurantDetail() {
  const { id } = useParams();
  const restaurantId = Number(id);

  const { cart, getTotalItems, getTotalPrice } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    queryFn: () =>
      base44.entities.MenuItem.filter({ restaurant_id: restaurantId }),
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
    return <Skeleton className="h-64 w-full" />;
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p>Restaurant not found</p>
        <Link to="/">
          <Button className="mt-4">Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">

      <div className="relative h-64">
        <img src={restaurant.image_url} className="w-full h-full object-cover" />
        <Link to="/">
          <Button className="absolute top-4 left-4">Back</Button>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className="px-4 py-1 rounded-full bg-gray-100"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-4">
        {filteredItems.map(item => (
          <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
        ))}
      </div>

    </div>
  );
}