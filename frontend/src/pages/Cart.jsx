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
  
  // For package deliveries, we already have all the details from the PackageDelivery page
  // So we don't need to ask for them again
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  // For package deliveries, use the details passed from the previous page
  // Only ask for delivery address for food orders
  const [pickupAddress, setPickupAddress] = useState(packageDetails?.pickup_address || '');
  const [recipientName, setRecipientName] = useState(packageDetails?.recipient_name || '');
  const [recipientPhone, setRecipientPhone] = useState(packageDetails?.recipient_phone || '');
  const [packageDescription, setPackageDescription] = useState(packageDetails?.description || '');
  const [packageWeight, setPackageWeight] = useState(packageDetails?.weight || '');
  const [packageDimensions, setPackageDimensions] = useState(packageDetails?.dimensions || '');
  const [requiresSignature, setRequiresSignature] = useState(packageDetails?.requires_signature || false);
  const [isFragile, setIsFragile] = useState(packageDetails?.is_fragile || false);

  // Calculate quote for package delivery (if not already provided)
  const calculateQuote = () => {
    if (deliveryType === 'food') return;
    
    const basePrice = deliveryType === 'package' ? 50 : deliveryType === 'document' ? 35 : 60;
    const weightPrice = (parseFloat(packageWeight) || 0) * 5;
    const signatureFee = requiresSignature ? 10 : 0;
    const fragileFee = isFragile ? 15 : 0;
    const total = basePrice + weightPrice + signatureFee + fragileFee;
    return { total: Math.max(20, total) };
  };

  const quote = calculateQuote();
  const orderTotal = deliveryType === 'food' 
    ? getNumericPrice(subtotal) + DELIVERY_FEE - promoDiscount
    : (quote?.total || 0) - promoDiscount;
  
  const discountedTotal = orderTotal;

  // For food orders, we need delivery address
  // For package orders, we already have all the info
  const canCheckout = () => {
    if (deliveryType === 'food') {
      return address.trim() !== '';
    } else {
      return pickupAddress.trim() !== '' && 
             address.trim() !== '' && 
             recipientName.trim() !== '';
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated && (itemCount > 0 || deliveryType !== 'food')) {
      toast.error('Please login to checkout');
      navigate('/login');
    }
  }, [isAuthenticated, loading, itemCount, navigate, deliveryType]);

  // Pre-fill address from packageDetails if available
  useEffect(() => {
    if (deliveryType !== 'food' && packageDetails?.delivery_address) {
      setAddress(packageDetails.delivery_address);
    }
  }, [deliveryType, packageDetails]);

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
    if (!canCheckout()) {
      if (deliveryType === 'food') {
        toast.error('Enter delivery address');
      } else {
        toast.error('Please fill in all required delivery details');
      }
      return;
    }

    setPlacing(true);
    setLoadingStep('Creating your order...');

    try {
      const orderNotes = deliveryType === 'food' ? notes : createPackageNotes();
      
      // Set correct status based on delivery type
      const orderStatus = deliveryType === 'food' ? 'pending' : 'pending_approval';
      
      // Determine required vehicle type based on weight
      const vehicleType = deliveryType !== 'food' && (parseFloat(packageWeight) || 0) > 30 ? 'car' : 'bike';
      
      const subtotalAmount = getNumericPrice(subtotal);
      
      // Step 1: Create the order in database
      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: deliveryType === 'food' ? cart.restaurantId : null,
          restaurant_name: deliveryType === 'food' ? cart.restaurantName : (deliveryType === 'package' ? 'Package Delivery' : deliveryType === 'document' ? 'Document Delivery' : 'Other Delivery'),
          status: orderStatus,
          total: discountedTotal,
          original_total: deliveryType === 'food' ? subtotalAmount : discountedTotal,
          delivery_address: address,
          delivery_fee: deliveryType === 'food' ? DELIVERY_FEE : discountedTotal,
          notes: orderNotes,
          payment_status: 'pending',
          payment_transaction_id: null,
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          delivery_type: deliveryType,
          required_vehicle_type: vehicleType,
          pickup_address: pickupAddress,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          package_description: packageDescription,
          package_weight: parseFloat(packageWeight) || 0,
          package_dimensions: packageDimensions,
          requires_signature: requiresSignature,
          is_fragile: isFragile,
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
    if (!canCheckout()) {
      if (deliveryType === 'food') {
        toast.error('Enter delivery address');
      } else {
        toast.error('Please fill in all required delivery details');
      }
      return;
    }

    setPlacing(true);

    try {
      toast.loading('Creating order...');
      
      const orderNotes = deliveryType === 'food' ? notes : createPackageNotes();
      
      const orderStatus = deliveryType === 'food' ? 'pending' : 'pending_approval';
      const vehicleType = deliveryType !== 'food' && (parseFloat(packageWeight) || 0) > 30 ? 'car' : 'bike';
      const subtotalAmount = getNumericPrice(subtotal);

      const res = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: deliveryType === 'food' ? cart.restaurantId : null,
          restaurant_name: deliveryType === 'food' ? cart.restaurantName : (deliveryType === 'package' ? 'Package Delivery' : deliveryType === 'document' ? 'Document Delivery' : 'Other Delivery'),
          status: orderStatus,
          total: discountedTotal,
          original_total: deliveryType === 'food' ? subtotalAmount : discountedTotal,
          delivery_address: address,
          delivery_fee: deliveryType === 'food' ? DELIVERY_FEE : discountedTotal,
          notes: orderNotes,
          payment_status: 'paid',
          payment_transaction_id: 'mock_' + Date.now(),
          promo_code: appliedPromoCode,
          discount_applied: promoDiscount,
          delivery_type: deliveryType,
          required_vehicle_type: vehicleType,
          pickup_address: pickupAddress,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          package_description: packageDescription,
          package_weight: parseFloat(packageWeight) || 0,
          package_dimensions: packageDimensions,
          requires_signature: requiresSignature,
          is_fragile: isFragile,
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
        {deliveryType === 'food' ? `From ${cart.restaurantName || 'Restaurant'}` : 'Review your delivery details before payment'}
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

        {/* Package Delivery Summary (for non-food) - SHOW SUMMARY, NOT FORM */}
        {deliveryType !== 'food' && (
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-2">📦 Delivery Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-28 text-gray-500">Pickup:</span>
                  <span className="flex-1">{pickupAddress || 'Not provided'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">Delivery:</span>
                  <span className="flex-1">{address || 'Not provided'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">Recipient:</span>
                  <span className="flex-1">{recipientName || 'Not provided'}</span>
                </div>
                {recipientPhone && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Phone:</span>
                    <span className="flex-1">{recipientPhone}</span>
                  </div>
                )}
                {packageDescription && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Description:</span>
                    <span className="flex-1">{packageDescription}</span>
                  </div>
                )}
                {(packageWeight || packageDimensions) && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Package:</span>
                    <span className="flex-1">
                      {packageWeight && `${packageWeight}kg`}
                      {packageWeight && packageDimensions && ' • '}
                      {packageDimensions && `${packageDimensions}cm`}
                    </span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-28 text-gray-500">Options:</span>
                  <span className="flex-1">
                    {requiresSignature && <span className="inline-block mr-2">📝 Signature</span>}
                    {isFragile && <span className="inline-block">⚠️ Fragile</span>}
                    {!requiresSignature && !isFragile && <span className="text-gray-400">None</span>}
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => navigate('/package-delivery', { state: { deliveryType: deliveryType } })}
              >
                Edit Details
              </Button>
            </div>
          </div>
        )}

        {/* Delivery Address (for food only) */}
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
            subtotal={deliveryType === 'food' ? getNumericPrice(subtotal) : orderTotal}
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
              <span>R{formatPrice(DELIVERY_FEE)}</span>
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
            disabled={placing || !canCheckout()}
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
            disabled={placing || !canCheckout()}
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