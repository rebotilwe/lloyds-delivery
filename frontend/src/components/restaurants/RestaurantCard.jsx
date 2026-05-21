import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike } from 'lucide-react';

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

export default function RestaurantCard({ restaurant }) {
  const rating = typeof restaurant.rating === 'string' ? parseFloat(restaurant.rating) : restaurant.rating;
  const isValidRating = !isNaN(rating) && rating > 0;
  const deliveryFee = typeof restaurant.delivery_fee === 'string' ? parseFloat(restaurant.delivery_fee) : restaurant.delivery_fee;
  
  const imageUrl = getRestaurantImage(restaurant);

  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <div className="bg-white rounded-lg md:rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-[16/10] relative overflow-hidden">
          <img
            src={imageUrl}
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