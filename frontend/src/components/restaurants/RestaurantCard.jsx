import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">

        <div className="aspect-[16/10] relative overflow-hidden">
          <img
            src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {restaurant.cuisine_type && (
            <span className="absolute top-3 left-3 bg-navy/90 text-white text-xs px-2 py-1 rounded-full">
              {restaurant.cuisine_type}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg">{restaurant.name}</h3>

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            {restaurant.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {restaurant.rating.toFixed(1)}
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {restaurant.estimated_delivery_time}
            </span>

            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              R{restaurant.delivery_fee || 0}
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}