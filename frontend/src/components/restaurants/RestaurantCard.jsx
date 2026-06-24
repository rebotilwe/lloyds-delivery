import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Different food images for variety based on cuisine type
const CUISINE_IMAGES = {
  'Kotas': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&h=400&fit=crop',
  'Burgers': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&h=400&fit=crop',
  'Pizzas': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
  'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
  'Sushi': 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop',
  'Fast Food': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&h=400&fit=crop',
  'Chinese': 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=400&fit=crop',
  'Indian': 'https://images.unsplash.com/photo-1585937421612-70a008356c36?w=600&h=400&fit=crop',
  'Mexican': 'https://images.unsplash.com/photo-1615874694520-474822394e73?w=600&h=400&fit=crop',
  'Italian': 'https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?w=600&h=400&fit=crop',
  'Healthy': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
  'Desserts': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop',
  'Seafood': 'https://images.unsplash.com/photo-1584727633194-745a1cf96a7c?w=600&h=400&fit=crop',
  'BBQ': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop',
  'Vegan': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
};

// Different images based on restaurant ID for additional variety
const ID_IMAGES = {
  1: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&h=400&fit=crop',
  2: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&h=400&fit=crop',
  3: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=400&fit=crop',
  4: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
  5: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=400&fit=crop',
  6: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop',
  7: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop',
  8: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&h=400&fit=crop',
  9: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
  10: 'https://images.unsplash.com/photo-1615874694520-474822394e73?w=600&h=400&fit=crop',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop';

const getRestaurantImage = (restaurant) => {
  // If restaurant has its own image_url, use it
  if (restaurant.image_url && restaurant.image_url !== 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop') {
    return restaurant.image_url;
  }
  
  // Try to get image by cuisine type first
  if (restaurant.cuisine_type && CUISINE_IMAGES[restaurant.cuisine_type]) {
    return CUISINE_IMAGES[restaurant.cuisine_type];
  }
  
  // Try by restaurant ID for variety
  if (restaurant.id && ID_IMAGES[restaurant.id]) {
    return ID_IMAGES[restaurant.id];
  }
  
  // Use modulo to assign images for any ID
  if (restaurant.id) {
    const images = Object.values(ID_IMAGES);
    return images[restaurant.id % images.length];
  }
  
  return DEFAULT_IMAGE;
};

// Format distance for display
const formatDistance = (distance) => {
  if (!distance || distance === Infinity) return null;
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export default function RestaurantCard({ restaurant }) {
  // Safe rating parsing with fallback
  const rating = restaurant?.rating ? parseFloat(restaurant.rating) : null;
  const isValidRating = rating !== null && !isNaN(rating) && rating > 0;
  
  // Safe delivery fee parsing
  const deliveryFee = restaurant?.delivery_fee ? parseFloat(restaurant.delivery_fee) : 0;
  const isValidDeliveryFee = !isNaN(deliveryFee);
  
  const imageUrl = getRestaurantImage(restaurant);
  
  // Get distance from restaurant object (added by Home page when sorting by distance)
  const distance = restaurant?.distance || null;
  const formattedDistance = formatDistance(distance);

  // Get restaurant address for Google Maps
  const restaurantAddress = restaurant?.address || restaurant?.location || '';

  const handleOpenInMaps = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (restaurantAddress) {
      const encodedAddress = encodeURIComponent(restaurantAddress);
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
    }
  };

  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <div className="bg-white rounded-lg md:rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Image Section */}
        <div className="aspect-[16/10] relative overflow-hidden">
          <img
            src={imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.src = DEFAULT_IMAGE;
            }}
          />
          {/* Cuisine Type Badge */}
          {restaurant.cuisine_type && (
            <span className="absolute top-2 left-2 md:top-3 md:left-3 bg-black/70 text-white text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded-full">
              {restaurant.cuisine_type}
            </span>
          )}
          {/* Distance Badge - Shows when user has location enabled */}
          {distance !== null && distance !== undefined && (
            <span className="absolute top-2 right-2 md:top-3 md:right-3 bg-green/90 text-white text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded-full flex items-center gap-1 shadow-md">
              <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {formattedDistance}
            </span>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-3 md:p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm md:text-lg line-clamp-1">{restaurant.name}</h3>
          
          {/* Address with Google Maps link */}
          {restaurantAddress && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-400 shrink-0" />
              <span className="text-[10px] md:text-xs text-gray-400 line-clamp-1 flex-1">
                {restaurantAddress}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 shrink-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                onClick={handleOpenInMaps}
                title="Open in Google Maps"
              >
                <Navigation className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Rating and Delivery Info */}
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
              R{isValidDeliveryFee ? deliveryFee.toFixed(0) : 15}
            </span>
          </div>

          {/* Distance Indicator - Shows when location is enabled */}
          {distance !== null && distance !== undefined && (
            <div className="mt-2">
              {distance < 2 && (
                <span className="text-[8px] md:text-[10px] text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Very close
                </span>
              )}
              {distance >= 2 && distance < 5 && (
                <span className="text-[8px] md:text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  Nearby
                </span>
              )}
              {distance >= 5 && distance < 10 && (
                <span className="text-[8px] md:text-[10px] text-yellow-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  Within 10km
                </span>
              )}
              {distance >= 10 && (
                <span className="text-[8px] md:text-[10px] text-orange-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                  {formattedDistance} away
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}