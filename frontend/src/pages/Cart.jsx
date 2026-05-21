import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/cartStore.jsx';
import { toast } from 'sonner';

// Helper function to safely format price
const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice.toFixed(2) : '0.00';
};

// Helper function to safely get numeric price
const getNumericPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice : 0;
};

export default function Cart() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    total,
    itemCount
  } = useCart();

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && itemCount > 0) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate]);

  // load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handlePlaceOrder = async () => {
    // Check authentication before placing order
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (!address.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    setPlacing(true);

    try {
      const res = await fetch('http://localhost:5000/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.full_name || user?.name || 'Customer',
          restaurant_id: cart.restaurantId,
          restaurant_name: cart.restaurantName,
          status: 'pending',
          total: getNumericPrice(total),
          delivery_address: address,
          delivery_fee: 0,
          notes: notes,
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price)
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to place order');
      }

      clearCart();
      toast.success('Order placed successfully!');

      navigate('/order-confirmation', {
        state: {
          orderId: data.orderId,
          restaurant: cart.restaurantName
        }
      });

    } catch (err) {
      console.error('Order error:', err);
      toast.error(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green"></div>
      </div>
    );
  }

  // EMPTY CART
  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="text-gray-500 mt-2">Add food from restaurants</p>

        <Link to="/">
          <Button className="mt-6 bg-green text-white">
            Browse Restaurants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      <Link to="/">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-1">Your Cart</h1>
      <p className="text-gray-500 mb-6">
        From {cart.restaurantName}
      </p>

      <div className="bg-white border rounded-xl">

        {/* ITEMS */}
        <div className="p-4 space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center justify-between">

              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-green">
                  R{formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="w-4 h-4" />
                </Button>

                <span className="w-8 text-center">{item.quantity}</span>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>

              </div>

              <p className="font-semibold">
                R{formatPrice(getNumericPrice(item.price) * item.quantity)}
              </p>

            </div>
          ))}
        </div>

        <Separator />

        {/* ADDRESS */}
        <div className="p-4 space-y-3">
          <Input
            placeholder="Delivery address *"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />

          <Textarea
            placeholder="Notes (optional) - e.g., gate code, building name, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <Separator />

        {/* TOTAL */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>R0.00</span>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-green">R{formatPrice(total)}</span>
          </div>
        </div>

        {/* BUTTON */}
        <div className="p-4 pt-0">
          <Button
            onClick={handlePlaceOrder}
            disabled={placing || !address.trim()}
            className="w-full bg-green hover:bg-green/90 text-white h-12"
          >
            {placing ? 'Placing Order...' : 'Place Order'}
          </Button>
        </div>

      </div>
    </div>
  );
}