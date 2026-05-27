import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/cartStore';
import { toast } from 'sonner';
import PromoCode from '@/components/PromoCode';

const DELIVERY_FEE = 20;
const API_URL = import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com/api';

const formatPrice = (price) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

const getNumericPrice = (price) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) ? num : 0;
};

export default function Cart() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    total,
    itemCount,
  } = useCart();

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && itemCount > 0) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate]);

  const handleApplyPromo = (discountAmount, message, promoCode) => {
    setPromoDiscount(discountAmount);
    setPromoMessage(message);
    setAppliedPromoCode(promoCode);
  };

  const handleRemovePromo = () => {
    setPromoDiscount(0);
    setPromoMessage('');
    setAppliedPromoCode(null);
  };

  const subtotalAmount = getNumericPrice(subtotal);
  const deliveryFee = DELIVERY_FEE;
  const discountedTotal = subtotalAmount + deliveryFee - promoDiscount;

  const handlePlaceOrder = async (method = 'mock') => {
    if (!address.trim()) {
      toast.error('Enter delivery address');
      return;
    }

    setPlacing(true);
    let orderId = null;

    try {
      toast.loading('Creating order...');

      // Create order
      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: cart.restaurantId,
          restaurant_name: cart.restaurantName,
          status: 'pending',
          total: discountedTotal,
          original_total: subtotalAmount,
          delivery_address: address,
          delivery_fee: deliveryFee,
          notes: notes,
          payment_status: method === 'mock' ? 'paid' : 'pending',
          payment_transaction_id: null,
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          items: cart.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');

      orderId = data.orderId;
      toast.dismiss();

      if (method === 'yoco') {
        // Create Yoco checkout session
        toast.loading('Redirecting to secure payment...');
        
        const checkoutRes = await fetch(`${API_URL}/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: discountedTotal, 
            orderId: orderId 
          }),
        });

        const checkoutData = await checkoutRes.json();
        
        if (!checkoutRes.ok) {
          throw new Error(checkoutData.message || 'Checkout failed');
        }

        // Save order ID for confirmation page
        localStorage.setItem('lastOrderId', orderId);
        localStorage.setItem('hasOrderedBefore', 'true');
        
        // Clear cart and redirect to Yoco's hosted payment page
        clearCart();
        
        // Redirect to Yoco's secure payment page
        window.location.href = checkoutData.redirectUrl;
        return;
      }

      // Mock payment - no real charge
      toast.success('Order placed successfully!');
      localStorage.setItem('lastOrderId', orderId);
      localStorage.setItem('hasOrderedBefore', 'true');
      clearCart();
      navigate('/order-confirmation', { state: { orderId: orderId } });

    } catch (err) {
      console.error('Order error:', err);
      toast.dismiss();
      toast.error(err.message || 'Order failed');
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-green rounded-full" />
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="text-gray-500 mt-2">Add food from restaurants</p>
        <Link to="/">
          <Button className="mt-6 bg-green text-white">Browse Restaurants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link to="/">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Continue Shopping
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-1">Your Cart</h1>
      <p className="text-gray-500 mb-6">From {cart.restaurantName || 'Restaurant'}</p>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-green">R{formatPrice(item.price)}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-8 w-8"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFromCart(item.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>

              <p className="font-semibold min-w-[80px] text-right">
                R{formatPrice(getNumericPrice(item.price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="p-4 space-y-3">
          <h3 className="font-semibold">Delivery Address</h3>
          <Input
            placeholder="Street address *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <Separator />

        <div className="p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R{formatPrice(subtotal)}</span>
          </div>

          <PromoCode
            subtotal={subtotalAmount}
            onApply={handleApplyPromo}
            onRemove={handleRemovePromo}
          />

          {promoDiscount > 0 && (
            <div className="flex justify-between text-green">
              <span>Discount ({promoMessage})</span>
              <span>-R{formatPrice(promoDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>R{formatPrice(deliveryFee)}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-green">R{formatPrice(discountedTotal)}</span>
          </div>
        </div>

        {/* Payment Options */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowPaymentOptions(!showPaymentOptions)}
            className="text-sm text-blue-600"
          >
            {showPaymentOptions ? '▼ Hide payment options' : '▶ Show payment options'}
          </button>
        </div>

        {showPaymentOptions && (
          <div className="px-4 pb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">💳 Yoco Test Cards</p>
              <p>• Visa: 4111 1111 1111 1111</p>
              <p>• Mastercard: 5555 5555 5555 4444</p>
              <p>• Amex: 3782 822463 10005</p>
              <p className="text-xs text-gray-500 mt-2">Any future expiry date & any CVV</p>
            </div>
          </div>
        )}

        <div className="p-4 pt-0 space-y-2">
          {/* Yoco Checkout Button */}
          <Button
            onClick={() => handlePlaceOrder('yoco')}
            disabled={placing || !address.trim()}
            className="w-full bg-green text-white h-11"
          >
            {placing ? 'Processing...' : `Pay with Card • R${formatPrice(discountedTotal)}`}
          </Button>

          {/* Test Mode Button */}
          <Button
            onClick={() => handlePlaceOrder('mock')}
            disabled={placing || !address.trim()}
            variant="outline"
            className="w-full h-11"
          >
            {placing ? 'Processing...' : `Test Mode (No Charge) • R${formatPrice(discountedTotal)}`}
          </Button>

          <p className="text-xs text-center text-gray-400">
            <Lock className="w-3 h-3 inline mr-1" />
            Secure payment by Yoco
          </p>
        </div>
      </div>
    </div>
  );
}