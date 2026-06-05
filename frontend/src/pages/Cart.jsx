import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Lock, Package, FileText, Truck } from 'lucide-react';
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
  const location = useLocation();

  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    itemCount,
  } = useCart();

  // Check if this is a package delivery (coming from PackageDelivery page)
  const [deliveryType, setDeliveryType] = useState(location.state?.deliveryType || 'food');
  const [packageDetails, setPackageDetails] = useState(location.state?.packageDetails || null);
  
  const [address, setAddress] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [packageDimensions, setPackageDimensions] = useState('');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [isFragile, setIsFragile] = useState(false);
  const [quote, setQuote] = useState(null);
  
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // Calculate quote for package delivery
  const calculateQuote = () => {
    if (deliveryType === 'food') return;
    
    const basePrice = deliveryType === 'package' ? 50 : deliveryType === 'document' ? 35 : 60;
    const weightPrice = (parseFloat(packageWeight) || 0) * 5;
    const signatureFee = requiresSignature ? 10 : 0;
    const fragileFee = isFragile ? 15 : 0;
    const total = basePrice + weightPrice + signatureFee + fragileFee;
    setQuote({ total: Math.max(20, total) });
  };

  useEffect(() => {
    if (deliveryType !== 'food' && !quote) {
      calculateQuote();
    }
  }, [deliveryType, packageWeight, requiresSignature, isFragile]);

  useEffect(() => {
    if (!loading && !isAuthenticated && (itemCount > 0 || deliveryType !== 'food')) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate, deliveryType]);

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
  const orderTotal = deliveryType === 'food' 
    ? subtotalAmount + deliveryFee - promoDiscount
    : (quote?.total || 0) - promoDiscount;
  
  const discountedTotal = orderTotal;

  // Create notes for package delivery
  const createPackageNotes = () => {
    let notesText = '';
    if (deliveryType !== 'food') {
      notesText += `Pickup: ${pickupAddress}\n`;
      notesText += `Delivery: ${address}\n`;
      notesText += `Recipient: ${recipientName} (${recipientPhone})\n`;
      notesText += `Description: ${packageDescription}\n`;
      if (packageWeight) notesText += `Weight: ${packageWeight}kg\n`;
      if (packageDimensions) notesText += `Dimensions: ${packageDimensions}\n`;
      if (requiresSignature) notesText += `requires_signature: true\n`;
      if (isFragile) notesText += `is_fragile: true\n`;
    }
    return notesText;
  };

  // Handle Place Order (Food or Package)
  const handlePlaceOrder = async () => {
    if (deliveryType === 'food') {
      if (!address.trim()) {
        toast.error('Enter delivery address');
        return;
      }
    } else {
      if (!pickupAddress.trim()) {
        toast.error('Enter pickup address');
        return;
      }
      if (!address.trim()) {
        toast.error('Enter delivery address');
        return;
      }
      if (!recipientName.trim()) {
        toast.error('Enter recipient name');
        return;
      }
    }

    setPlacing(true);
    setLoadingStep('Creating your order...');

    try {
      const orderNotes = deliveryType === 'food' ? notes : createPackageNotes();
      
      // Step 1: Create the order in database
      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: deliveryType === 'food' ? cart.restaurantId : null,
          restaurant_name: deliveryType === 'food' ? cart.restaurantName : (deliveryType === 'package' ? 'Package Delivery' : deliveryType === 'document' ? 'Document Delivery' : 'Other Delivery'),
          status: 'pending',
          total: discountedTotal,
          original_total: deliveryType === 'food' ? subtotalAmount : discountedTotal,
          delivery_address: address,
          delivery_fee: deliveryType === 'food' ? deliveryFee : discountedTotal,
          notes: orderNotes,
          payment_status: 'pending',
          payment_transaction_id: null,
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          delivery_type: deliveryType,
          items: deliveryType === 'food' ? cart.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price),
          })) : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');

      const orderId = data.orderId;
      toast.dismiss();
      setLoadingStep('Preparing secure payment...');

      // Step 2: Create Yoco checkout session
      const checkoutResponse = await fetch(`${API_URL}/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: discountedTotal,
          orderId: orderId,
        }),
      });

      const checkoutData = await checkoutResponse.json();

      if (checkoutData.redirectUrl) {
        setLoadingStep('Redirecting to payment page...');
        localStorage.setItem('lastOrderId', orderId);
        if (deliveryType === 'food') {
          clearCart();
        }
        setTimeout(() => {
          window.location.href = checkoutData.redirectUrl;
        }, 500);
      } else {
        throw new Error('No redirectUrl from Yoco');
      }

    } catch (err) {
      console.error('Order error:', err);
      toast.dismiss();
      toast.error(err.message || 'Order failed');
      setPlacing(false);
      setLoadingStep('');
    }
  };

  // Mock payment for testing
  const handleMockOrder = async () => {
    if (deliveryType === 'food') {
      if (!address.trim()) {
        toast.error('Enter delivery address');
        return;
      }
    } else {
      if (!pickupAddress.trim() || !address.trim() || !recipientName.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    setPlacing(true);

    try {
      toast.loading('Creating order...');
      
      const orderNotes = deliveryType === 'food' ? notes : createPackageNotes();

      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: deliveryType === 'food' ? cart.restaurantId : null,
          restaurant_name: deliveryType === 'food' ? cart.restaurantName : (deliveryType === 'package' ? 'Package Delivery' : deliveryType === 'document' ? 'Document Delivery' : 'Other Delivery'),
          status: 'pending',
          total: discountedTotal,
          original_total: deliveryType === 'food' ? subtotalAmount : discountedTotal,
          delivery_address: address,
          delivery_fee: deliveryType === 'food' ? deliveryFee : discountedTotal,
          notes: orderNotes,
          payment_status: 'paid',
          payment_transaction_id: 'mock_' + Date.now(),
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          delivery_type: deliveryType,
          items: deliveryType === 'food' ? cart.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: getNumericPrice(item.price),
          })) : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create order');

      const orderId = data.orderId;
      toast.dismiss();
      toast.success('Order placed successfully!');

      localStorage.setItem('lastOrderId', orderId);
      localStorage.setItem('hasOrderedBefore', 'true');
      if (deliveryType === 'food') {
        clearCart();
      }
      navigate('/order-confirmation', { state: { orderId: orderId } });

    } catch (err) {
      console.error('Order error:', err);
      toast.dismiss();
      toast.error(err.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  // Get delivery type icon
  const getDeliveryIcon = () => {
    switch(deliveryType) {
      case 'package': return <Package className="w-5 h-5 text-purple-500" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'other': return <Truck className="w-5 h-5 text-orange-500" />;
      default: return <ShoppingBag className="w-5 h-5 text-green" />;
    }
  };

  const getDeliveryTitle = () => {
    switch(deliveryType) {
      case 'package': return 'Package Delivery';
      case 'document': return 'Document Delivery';
      case 'other': return 'Other Delivery';
      default: return 'Food Delivery';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-green rounded-full" />
      </div>
    );
  }

  // Show empty cart for food delivery only
  if (deliveryType === 'food' && itemCount === 0) {
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
      <Link to={deliveryType === 'food' ? '/' : '/package-delivery'}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {deliveryType === 'food' ? 'Continue Shopping' : 'Back'}
        </Button>
      </Link>

      <div className="flex items-center gap-2 mb-1">
        {getDeliveryIcon()}
        <h1 className="text-2xl font-bold">{getDeliveryTitle()}</h1>
      </div>
      <p className="text-gray-500 mb-6">
        {deliveryType === 'food' ? `From ${cart.restaurantName || 'Restaurant'}` : 'Complete your delivery details below'}
      </p>

      <div className="bg-white border rounded-xl overflow-hidden">
        {/* Food Items Section (only for food delivery) */}
        {deliveryType === 'food' && cart.items.length > 0 && (
          <>
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
          </>
        )}

        {/* Package Delivery Form (for non-food) */}
        {deliveryType !== 'food' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Pickup Address *</label>
              <Input
                placeholder="Where should we pick up from?"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Delivery Address *</label>
              <Input
                placeholder="Where should we deliver to?"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Recipient Name *</label>
                <Input
                  placeholder="Who is receiving?"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Recipient Phone</label>
                <Input
                  placeholder="Recipient contact number"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Package Description</label>
              <Textarea
                placeholder="Describe what you're sending..."
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="e.g., 2.5"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  className="mt-1"
                  onBlur={calculateQuote}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dimensions (cm)</label>
                <Input
                  placeholder="e.g., 30x20x10"
                  value={packageDimensions}
                  onChange={(e) => setPackageDimensions(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresSignature}
                  onChange={(e) => { setRequiresSignature(e.target.checked); calculateQuote(); }}
                  className="w-4 h-4"
                />
                <span className="text-sm">📝 Requires Signature (+R10)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => { setIsFragile(e.target.checked); calculateQuote(); }}
                  className="w-4 h-4"
                />
                <span className="text-sm">⚠️ Fragile Item (+R15)</span>
              </label>
            </div>
          </div>
        )}

        {/* Delivery Address (for food only - shown above) */}
        {deliveryType === 'food' && (
          <>
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
          </>
        )}

        <Separator />

        {/* Price Summary */}
        <div className="p-4 space-y-2">
          {deliveryType === 'food' && (
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R{formatPrice(subtotal)}</span>
            </div>
          )}

          <PromoCode
            subtotal={deliveryType === 'food' ? subtotalAmount : orderTotal}
            onApply={handleApplyPromo}
            onRemove={handleRemovePromo}
          />

          {promoDiscount > 0 && (
            <div className="flex justify-between text-green">
              <span>Discount ({promoMessage})</span>
              <span>-R{formatPrice(promoDiscount)}</span>
            </div>
          )}

          {deliveryType === 'food' && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>R{formatPrice(deliveryFee)}</span>
            </div>
          )}

          {deliveryType !== 'food' && quote && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Base delivery fee</span>
                <span>R{deliveryType === 'package' ? 50 : deliveryType === 'document' ? 35 : 60}</span>
              </div>
              {packageWeight > 0 && (
                <div className="flex justify-between">
                  <span>Weight charge (R5/kg)</span>
                  <span>R{(parseFloat(packageWeight) * 5).toFixed(2)}</span>
                </div>
              )}
              {requiresSignature && (
                <div className="flex justify-between">
                  <span>Signature required</span>
                  <span>R10.00</span>
                </div>
              )}
              {isFragile && (
                <div className="flex justify-between">
                  <span>Fragile handling</span>
                  <span>R15.00</span>
                </div>
              )}
            </div>
          )}

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
            {showPaymentOptions ? '▼ Hide test card info' : '▶ Show test card info'}
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
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full py-3 bg-green text-white rounded-lg font-medium hover:bg-green/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {placing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm">{loadingStep || "Processing..."}</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay R{formatPrice(discountedTotal)} Securely
              </>
            )}
          </button>

          <button
            onClick={handleMockOrder}
            disabled={placing}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 border border-gray-300"
          >
            {placing ? 'Processing...' : `🎮 Demo Mode (No Charge) • R${formatPrice(discountedTotal)}`}
          </button>

          <p className="text-xs text-center text-gray-400">
            <Lock className="w-3 h-3 inline mr-1" />
            Secure payment by Yoco
          </p>
        </div>
      </div>
    </div>
  );
}