import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/cartStore.jsx';
import { toast } from 'sonner';

const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice.toFixed(2) : '0.00';
};

const getNumericPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice : 0;
};

const processMockPayment = async (amount) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true, transactionId: `TXN_${Date.now()}`, amount };
};

const API_URL = import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com/api';

export default function Cart() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart, subtotal, total, itemCount } = useCart();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && itemCount > 0) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate]);

  const handlePlaceOrder = async () => {
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
      const orderTotal = getNumericPrice(total);
      toast.loading('Processing payment...');
      const paymentResult = await processMockPayment(orderTotal);
      toast.dismiss();
      
      if (!paymentResult.success) throw new Error('Payment failed');
      toast.success(`Payment successful!`);

      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: cart.restaurantId,
          restaurant_name: cart.restaurantName,
          status: 'pending',
          total: orderTotal,
          delivery_address: address,
          delivery_fee: 0,
          notes: notes,
          payment_status: 'paid',
          payment_transaction_id: paymentResult.transactionId,
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price)
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');
      clearCart();
      toast.success('Order placed successfully!');
      navigate('/order-confirmation', { state: { orderId: data.orderId, restaurant: cart.restaurantName } });
    } catch (err) {
      console.error('Order error:', err);
      toast.error(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green" /></div>;
  }

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="text-gray-500 mt-2 text-sm">Add food from restaurants</p>
        <Link to="/"><Button className="mt-6 bg-green text-white">Browse Restaurants</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <Link to="/"><Button variant="ghost" className="mb-4 text-sm"><ArrowLeft className="w-4 h-4 mr-1" /> Continue Shopping</Button></Link>
      <h1 className="text-xl md:text-2xl font-bold mb-1">Your Cart</h1>
      <p className="text-gray-500 text-sm mb-4 md:mb-6">From {cart.restaurantName}</p>

    <div className="bg-white border rounded-xl overflow-hidden">
  <div className="p-3 md:p-4 space-y-3 md:space-y-4">
    {cart.items.map(item => (
      <div key={item.id} className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-[120px]">
          <p className="font-medium text-sm md:text-base">{item.name}</p>
          <p className="text-xs md:text-sm text-green">R{formatPrice(item.price)}</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button size="icon" variant="outline" className="h-7 w-7 md:h-8 md:w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="w-3 h-3 md:w-4 md:h-4" /></Button>
          <span className="w-6 text-center text-sm md:text-base">{item.quantity}</span>
          <Button size="icon" variant="outline" className="h-7 w-7 md:h-8 md:w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3 md:w-4 md:h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 md:h-8 md:w-8" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3 md:w-4 h-4 text-red-500" /></Button>
        </div>
        <p className="font-semibold text-sm md:text-base min-w-[70px] text-right">R{formatPrice(getNumericPrice(item.price) * item.quantity)}</p>
      </div>
    ))}
  </div>

  <Separator />
  <div className="p-3 md:p-4 space-y-3">
    <h3 className="font-semibold text-sm md:text-base mb-2">Delivery Address</h3>
    <Input placeholder="Street address *" value={address} onChange={e => setAddress(e.target.value)} className="text-sm md:text-base" />
    <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="h-20 text-sm md:text-base" />
  </div>
  <Separator />

  <div className="p-3 md:p-4 space-y-2">
    <div className="flex justify-between text-sm"><span>Subtotal</span><span>R{formatPrice(subtotal)}</span></div>
    <div className="flex justify-between text-sm"><span>Delivery fee</span><span>R0.00</span></div>
    <Separator className="my-2" />
    <div className="flex justify-between font-bold text-base md:text-lg"><span>Total</span><span className="text-green">R{formatPrice(total)}</span></div>
  </div>

  <div className="p-3 md:p-4 pt-0">
    <Button onClick={handlePlaceOrder} disabled={placing || !address.trim()} className="w-full bg-green hover:bg-green/90 text-white h-10 md:h-12 text-sm md:text-base">
      {placing ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" /> Placing Order...</> : <>Place Order</>}
    </Button>
  </div>
</div>
    </div>
  );
}