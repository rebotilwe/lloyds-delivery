import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/cartStore.jsx';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Cart() {
  const { cart, updateQuantity, removeItem, clearCart, subtotal, total, itemCount } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.address) setAddress(u.address);
    }).catch(() => {});
  }, []);

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    setPlacing(true);
    
    try {
      const currentUser = await base44.auth.me();
      
      if (!currentUser || !currentUser.email) {
        toast.error('Please login to place an order');
        navigate('/login');
        return;
      }
      
      const order = await base44.entities.Order.create({
        customer_email: currentUser.email,
        customer_name: currentUser.full_name || currentUser.email,
        restaurant_id: cart.restaurantId,
        restaurant_name: cart.restaurantName,
        items: cart.items.map(i => ({
          menu_item_id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        subtotal,
        delivery_fee: cart.deliveryFee || 0,
        total,
        status: 'pending',
        delivery_address: address,
        payment_status: 'paid',
        notes,
      });

      await base44.entities.Payment.create({
        order_id: order.id,
        customer_email: currentUser.email,
        amount: total,
        status: 'success',
        payment_method: 'card',
        reference: `PAY-${Date.now()}`,
      });

      clearCart();
      toast.success('Order placed successfully!');
      
      // Navigate to order confirmation page with order details
      navigate(`/order-confirmation?orderId=LD-${order.id.toString().slice(-8).toUpperCase()}&restaurant=${encodeURIComponent(cart.restaurantName)}&eta=30-45`);
      
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
      console.error(error);
    } finally {
      setPlacing(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2">Browse restaurants and add some delicious food</p>
        <Link to="/">
          <Button className="mt-6 bg-green hover:bg-green-600 text-white">
            Browse Restaurants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Continue Shopping
        </Button>
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Cart</h1>
      <p className="text-gray-500 text-sm mb-6">From {cart.restaurantName}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                <span className="text-sm text-green font-semibold">R{item.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <span className="font-semibold w-20 text-right">R{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="p-4 space-y-4">
          <Input
            placeholder="Delivery address *"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <Textarea
            placeholder="Special instructions (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-20"
          />
        </div>

        <Separator />

        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>R{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery fee</span>
            <span>R{(cart.deliveryFee || 0).toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-green">R{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-4 pt-0">
          <Button
            className="w-full h-12 bg-green hover:bg-green-600 text-white text-base font-semibold rounded-xl"
            onClick={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <CreditCard className="w-5 h-5 mr-2" />
            )}
            {placing ? 'Placing Order...' : `Pay R${total.toFixed(2)}`}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Secure payment • Lloyd's Delivery
          </p>
        </div>
      </div>
    </div>
  );
}