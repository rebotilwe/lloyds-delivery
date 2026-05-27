import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/cartStore';
import { toast } from 'sonner';
import PromoCode from '@/components/PromoCode';

// Yoco Test Keys
const YOCO_PUBLIC_KEY = 'pk_test_3842a5a0Y92XqNq99764';

// Standard delivery fee for Verulam
const DELIVERY_FEE = 20;

// Multiple Yoco SDK URLs to try (in case one fails)
const YOCO_SDK_URLS = [
  'https://js.yoco.com/sdk/v1/yoco.js',
  'https://js.yoco.com/sdk/yoco-sdk.js',
  'https://pay.yoco.com/sdk/v1/yoco.js'
];

const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice.toFixed(2) : '0.00';
};

const getNumericPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) ? numPrice : 0;
};

const API_URL = import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com/api';

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
    itemCount 
  } = useCart();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(true);
  const [useMockPayment, setUseMockPayment] = useState(false);

  // Load Yoco SDK with fallback
  useEffect(() => {
    const loadYocoSDK = async () => {
      // Check if already loaded
      if (window.YocoSDK) {
        setSdkLoaded(true);
        setSdkLoading(false);
        return;
      }

      // Try each URL
      for (const url of YOCO_SDK_URLS) {
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
              // Check if SDK loaded after script loads
              setTimeout(() => {
                if (window.YocoSDK) {
                  resolve();
                } else {
                  reject(new Error('SDK not available'));
                }
              }, 200);
            };
            
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(script);
          });
          
          console.log(`✅ Yoco SDK loaded from ${url}`);
          setSdkLoaded(true);
          setSdkLoading(false);
          return;
        } catch (err) {
          console.warn(`Failed to load Yoco from ${url}:`, err);
        }
      }
      
      // If all URLs fail, use mock payment for testing
      console.warn('⚠️ All Yoco SDK URLs failed, using mock payment mode');
      setUseMockPayment(true);
      setSdkLoaded(true); // Allow checkout with mock payment
      setSdkLoading(false);
      toast.warning('Using test payment mode. No actual charge will be made.');
    };

    loadYocoSDK();
  }, []);

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

  // Calculate total with delivery fee
  const subtotalAmount = getNumericPrice(subtotal);
  const deliveryFee = DELIVERY_FEE;
  const totalWithDelivery = subtotalAmount + deliveryFee;
  const discountedTotal = totalWithDelivery - promoDiscount;

  // Process payment (Yoco or Mock)
  const processPayment = async (amount, orderId) => {
    if (useMockPayment) {
      // Mock payment for testing
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: true,
        transactionId: `MOCK_${Date.now()}`,
        paymentMethod: 'mock'
      };
    }

    return new Promise((resolve, reject) => {
      if (!window.YocoSDK) {
        reject(new Error('Payment system not ready'));
        return;
      }

      try {
        const yoco = new window.YocoSDK({
          publicKey: YOCO_PUBLIC_KEY,
        });

        const amountInCents = Math.round(amount * 100);

        yoco.showPopup({
          amountInCents: amountInCents,
          currency: 'ZAR',
          name: 'Lloyd\'s Delivery',
          description: `Order #${orderId}`,
          callback: (result) => {
            if (result.error) {
              console.error('Yoco payment error:', result.error);
              reject(new Error(result.error.message || 'Payment failed'));
            } else {
              console.log('Yoco payment success:', result);
              resolve({
                success: true,
                transactionId: result.id,
                paymentMethod: 'card'
              });
            }
          }
        });
      } catch (err) {
        console.error('Yoco instance error:', err);
        reject(new Error('Failed to initialize payment'));
      }
    });
  };

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
    if (!sdkLoaded) {
      toast.error('Payment system is still loading. Please wait...');
      return;
    }

    setPlacing(true);
    let orderId = null;

    try {
      const orderTotal = discountedTotal;
      
      // Step 1: Create order with pending payment
      toast.loading('Creating order...');
      
      const createOrderRes = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: cart.restaurantId,
          restaurant_name: cart.restaurantName,
          status: 'pending',
          total: orderTotal,
          original_total: getNumericPrice(total),
          delivery_address: address,
          delivery_fee: deliveryFee,
          notes: notes,
          payment_status: useMockPayment ? 'paid' : 'pending',
          payment_transaction_id: null,
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price)
          }))
        })
      });

      const orderData = await createOrderRes.json();
      if (!createOrderRes.ok) throw new Error(orderData.message || 'Failed to create order');
      
      orderId = orderData.orderId;
      toast.dismiss();

      if (!useMockPayment) {
        toast.loading('Processing payment...');
        // Step 2: Process Yoco payment
        const paymentResult = await processPayment(orderTotal, orderId);
        toast.dismiss();

        if (!paymentResult.success) throw new Error('Payment failed');

        // Step 3: Update order with payment confirmation
        await fetch(`${API_URL}/orders/${orderId}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'paid',
            payment_transaction_id: paymentResult.transactionId
          })
        });
      }

      toast.success('Order placed successfully!');
      localStorage.setItem('hasOrderedBefore', 'true');
      clearCart();
      
      navigate('/order-confirmation', { 
        state: { 
          orderId: orderId, 
          restaurant: cart.restaurantName
        } 
      });
      
    } catch (err) {
      console.error('Order error:', err);
      toast.dismiss();
      
      if (orderId) {
        try {
          await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Payment failed' })
          });
        } catch (cancelErr) {
          console.error('Failed to cancel order:', cancelErr);
        }
      }
      
      toast.error(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading || sdkLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green" />
        <p className="ml-3 text-gray-500">Loading secure payment...</p>
      </div>
    );
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
      <p className="text-gray-500 text-sm mb-4 md:mb-6">From {cart.restaurantName || 'Restaurant'}</p>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-3 md:p-4 space-y-3 md:space-y-4">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[120px]">
                <p className="font-medium text-sm md:text-base">{item.name}</p>
                <p className="text-xs md:text-sm text-green">R{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7 md:h-8 md:w-8" 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
                <span className="w-6 text-center text-sm md:text-base">{item.quantity}</span>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7 md:h-8 md:w-8" 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 md:h-8 md:w-8" 
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="w-3 h-3 md:w-4 h-4 text-red-500" />
                </Button>
              </div>
              <p className="font-semibold text-sm md:text-base min-w-[70px] text-right">
                R{formatPrice(getNumericPrice(item.price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <Separator />
        <div className="p-3 md:p-4 space-y-3">
          <h3 className="font-semibold text-sm md:text-base mb-2">Delivery Address</h3>
          <Input 
            placeholder="Street address * (Verulam area)" 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            className="text-sm md:text-base" 
          />
          <p className="text-xs text-gray-500">📍 Delivery fee: R{deliveryFee} (Standard rate for Verulam area)</p>
          <Textarea 
            placeholder="Notes (optional)" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            className="h-20 text-sm md:text-base" 
          />
        </div>
        <Separator />

        <div className="p-3 md:p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R{formatPrice(subtotal)}</span>
          </div>
          
          <PromoCode 
            subtotal={subtotalAmount} 
            onApply={handleApplyPromo}
            onRemove={handleRemovePromo}
          />
          
          {promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green">
              <span>Discount {promoMessage && `(${promoMessage})`}</span>
              <span>-R{formatPrice(promoDiscount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Delivery fee (Verulam)</span>
            <span>R{formatPrice(deliveryFee)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-base md:text-lg">
            <span>Total</span>
            <span className="text-green">R{formatPrice(discountedTotal)}</span>
          </div>
        </div>

        {/* Payment Notice */}
        <div className="px-3 md:px-4">
          <div className={`rounded-lg p-2 mb-2 flex items-center gap-2 justify-center ${useMockPayment ? 'bg-yellow-50' : 'bg-blue-50'}`}>
            <Lock className={`w-3 h-3 ${useMockPayment ? 'text-yellow-600' : 'text-blue-600'}`} />
            <p className={`text-xs ${useMockPayment ? 'text-yellow-600' : 'text-blue-600'}`}>
              {useMockPayment ? '🧪 TEST MODE - No actual charge' : 'Secure payment powered by Yoco'}
            </p>
          </div>
        </div>

        <div className="p-3 md:p-4 pt-0">
          <Button 
            onClick={handlePlaceOrder} 
            disabled={placing || !address.trim()} 
            className="w-full bg-green hover:bg-green/90 text-white h-10 md:h-12 text-sm md:text-base"
          >
            {placing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" /> 
                Processing...
              </>
            ) : (
              `${useMockPayment ? 'Place Test Order' : 'Pay with Card'} • R${formatPrice(discountedTotal)}`
            )}
          </Button>
          <p className="text-xs text-gray-400 text-center mt-2">
            <CreditCard className="w-3 h-3 inline mr-1" />
            {useMockPayment ? 'Test mode - No real payment required' : 'Visa, Mastercard, Amex accepted'}
          </p>
        </div>
      </div>
    </div>
  );
}