import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MenuItemCard({ item, restaurant }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleAdd = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    addToCart(item, restaurant?.id, restaurant?.name);
    toast.success(`${item.name} added to cart`);
  };

  const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const formattedPrice = !isNaN(price) ? price.toFixed(2) : '0.00';

  return (
    <div className="bg-white rounded-lg md:rounded-xl border border-gray-200 overflow-hidden flex hover:shadow-md transition-shadow group">
      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-1">{item.name}</h4>
          {item.description && (
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 md:mt-3">
          <span className="font-bold text-green text-sm md:text-lg">R{formattedPrice}</span>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-green hover:bg-green/600 text-white rounded-full h-7 w-7 md:h-9 md:w-9 p-0 shadow-sm"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>
      <div className="w-20 h-20 md:w-28 md:h-28 shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 md:w-8 md:h-8 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}