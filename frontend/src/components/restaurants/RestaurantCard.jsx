import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  const rating = typeof restaurant.rating === 'string' ? parseFloat(restaurant.rating) : restaurant.rating;
  const isValidRating = !isNaN(rating) && rating > 0;
  const deliveryFee = typeof restaurant.delivery_fee === 'string' ? parseFloat(restaurant.delivery_fee) : restaurant.delivery_fee;

  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <div className="bg-white rounded-lg md:rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-[16/10] relative overflow-hidden">
          <img
            src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {restaurant.cuisine_type && (
            <span className="absolute top-2 left-2 md:top-3 md:left-3 bg-black/70 text-white text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded-full">
              {restaurant.cuisine_type}
            </span>
          )}
        </div>
        <div className="p-3 md:p-4">
          <h3 className="font-semibold text-sm md:text-lg line-clamp-1">{restaurant.name}</h3>
          <div className="flex items-center gap-2 md:gap-4 mt-2 text-[11px] md:text-sm text-gray-500">
            {isValidRating && (
              <span className="flex items-center gap-0.5 md:gap-1">
                <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-yellow-400" />
                <span>{rating.toFixed(1)}</span>
              </span>
            )}
            {restaurant.estimated_delivery_time && (
              <span className="flex items-center gap-0.5 md:gap-1">
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden xs:inline">{restaurant.estimated_delivery_time}</span>
              </span>
            )}
            <span className="flex items-center gap-0.5 md:gap-1">
              <Bike className="w-3 h-3 md:w-3.5 md:h-3.5" />
              R{!isNaN(deliveryFee) ? deliveryFee.toFixed(0) : 15}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}