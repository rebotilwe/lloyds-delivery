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

// Mock payment function (replace with real payment gateway later)
const processMockPayment = async (amount, paymentMethod = 'card') => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock successful payment (always succeeds for testing)
  // In production, this would call Yoco/Paystack API
  return {
    success: true,
    transactionId: `TXN_${Date.now()}`,
    amount: amount,
    method: paymentMethod,
    message: 'Payment successful'
  };
};

export default function Cart() {
  const { user, isAuthenticated, loading } = useAuth();
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
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && itemCount > 0) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate]);

  const handlePlaceOrder = async () => {
    // Check authentication
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
      
      // STEP 1: Process payment first
      toast.loading('Processing payment...');
      const paymentResult = await processMockPayment(orderTotal, paymentMethod);
      toast.dismiss();
      
      if (!paymentResult.success) {
        throw new Error('Payment failed. Please try again.');
      }
      
      toast.success(`Payment successful! Transaction ID: ${paymentResult.transactionId}`);
      
      // STEP 2: Create order after successful payment
      const res = await fetch('http://localhost:5000/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      clearCart();
      toast.success('Order placed successfully!');

      navigate('/order-confirmation', {
        state: {
          orderId: data.orderId,
          restaurant: cart.restaurantName,
          transactionId: paymentResult.transactionId,
          amount: orderTotal
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

      <div className="bg-white border rounded-xl overflow-hidden">
        {/* ITEMS */}
        <div className="p-4 space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-green">R{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <p className="font-semibold">R{formatPrice(getNumericPrice(item.price) * item.quantity)}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* DELIVERY ADDRESS */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-lg mb-2">Delivery Address</h3>
          <Input 
            placeholder="Street address *" 
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

        {/* PAYMENT METHOD */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-lg mb-2">Payment Method</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4 text-green"
              />
              <CreditCard className="w-4 h-4" />
              <span>Card Payment</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentMethod"
                value="mock"
                checked={paymentMethod === 'mock'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-4 h-4 text-green"
              />
              <Lock className="w-4 h-4" />
              <span>Mock Payment (Test)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            🔐 Secure payment processed by Yoco/Paystack (coming soon)
          </p>
        </div>

        <Separator />

        {/* ORDER SUMMARY */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>R0.00</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (0%)</span>
            <span>R0.00</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total to pay</span>
            <span className="text-green">R{formatPrice(total)}</span>
          </div>
        </div>

        <Separator />

        {/* PLACE ORDER BUTTON */}
        <div className="p-4 pt-0">
          <Button
            onClick={handlePlaceOrder}
            disabled={placing || !address.trim()}
            className="w-full bg-green hover:bg-green/90 text-white h-12 text-base font-semibold"
          >
            {placing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pay R{formatPrice(total)} & Place Order
              </>
            )}
          </Button>
          <p className="text-xs text-center text-gray-500 mt-3">
            By placing your order, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}