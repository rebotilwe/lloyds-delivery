import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MenuItemCard({ item, restaurant }) {
  const { addToCart } = useCart();  // ✅ FIXED: useCart not useAuth
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleAdd = () => {
    // Check if user is logged in
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    addToCart(item, restaurant?.id, restaurant?.name);
    toast.success(`${item.name} added to cart`);
  };

  // Convert price to number (handle both string and number)
  const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const formattedPrice = !isNaN(price) ? price.toFixed(2) : '0.00';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex hover:shadow-md transition-shadow group">
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="font-semibold text-gray-900">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-green text-lg">R{formattedPrice}</span>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-green hover:bg-green/600 text-white rounded-full h-9 w-9 p-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="w-28 h-28 shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}