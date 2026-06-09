import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Package, FileText, Truck, Weight, Ruler, AlertCircle, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';

const deliveryTypes = {
  package: { label: 'Package Delivery', icon: Package, basePrice: 50, maxWeight: 30, maxDimension: 100 },
  document: { label: 'Document Delivery', icon: FileText, basePrice: 35, maxWeight: 2, maxDimension: 40 },
  other: { label: 'Other Delivery', icon: Truck, basePrice: 60, maxWeight: 50, maxDimension: 150 },
};

// Phone number validation function
const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  // Remove any non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  // South African phone numbers: 10 digits (starting with 0) or 11 digits (starting with 27)
  if (digits.length === 10 && digits.startsWith('0')) return true;
  if (digits.length === 11 && digits.startsWith('27')) return true;
  if (digits.length === 9) return true; // Local format
  return false;
};

// Format phone number for display
const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

export default function PackageDelivery() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deliveryType = location.state?.deliveryType || 'package';

  const [formData, setFormData] = useState({
    pickup_address: '',
    delivery_address: '',
    recipient_name: '',
    recipient_phone: '',
    weight: '',
    dimensions: '',
    description: '',
    requires_signature: false,
    is_fragile: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const deliveryInfo = deliveryTypes[deliveryType] || deliveryTypes.package;

  // Validate form before calculating quote
  const validateForm = () => {
    const newErrors = {};
    
    // Validate pickup address
    if (!formData.pickup_address.trim()) {
      newErrors.pickup_address = 'Pickup address is required';
    }
    
    // Validate delivery address
    if (!formData.delivery_address.trim()) {
      newErrors.delivery_address = 'Delivery address is required';
    }
    
    // Validate recipient name (REQUIRED)
    if (!formData.recipient_name.trim()) {
      newErrors.recipient_name = 'Recipient name is required';
    }
    
    // Validate recipient phone (REQUIRED with format validation)
    if (!formData.recipient_phone.trim()) {
      newErrors.recipient_phone = 'Recipient phone number is required';
    } else if (!validatePhoneNumber(formData.recipient_phone)) {
      newErrors.recipient_phone = 'Please enter a valid South African phone number (e.g., 0712345678 or 27712345678)';
    }
    
    // Validate weight with max limit
    const weightNum = parseFloat(formData.weight);
    if (formData.weight && (isNaN(weightNum) || weightNum < 0)) {
      newErrors.weight = 'Please enter a valid weight';
    } else if (formData.weight && weightNum > deliveryInfo.maxWeight) {
      newErrors.weight = `Maximum weight allowed is ${deliveryInfo.maxWeight}kg for ${deliveryInfo.label}`;
    }
    
    // Validate dimensions format
    if (formData.dimensions) {
      const dimensionMatch = formData.dimensions.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
      if (!dimensionMatch) {
        newErrors.dimensions = 'Please use format: L x W x H (e.g., 30x20x10)';
      } else {
        const [_, l, w, h] = dimensionMatch;
        const maxDim = Math.max(parseFloat(l), parseFloat(w), parseFloat(h));
        if (maxDim > deliveryInfo.maxDimension) {
          newErrors.dimensions = `Maximum dimension allowed is ${deliveryInfo.maxDimension}cm for ${deliveryInfo.label}`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateQuote = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before calculating quote');
      return;
    }
    
    const basePrice = deliveryInfo.basePrice;
    const weightPrice = (parseFloat(formData.weight) || 0) * 5;
    const signatureFee = formData.requires_signature ? 10 : 0;
    const fragileFee = formData.is_fragile ? 15 : 0;
    const total = basePrice + weightPrice + signatureFee + fragileFee;
    setQuote({ total: Math.max(20, total) });
  };

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, '');
    const formatted = formatPhoneNumber(digitsOnly);
    setFormData({ ...formData, recipient_phone: formatted });
    
    // Clear error when user starts typing
    if (errors.recipient_phone && formatted) {
      setErrors({ ...errors, recipient_phone: '' });
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData({ ...formData, weight: value });
      if (errors.weight) setErrors({ ...errors, weight: '' });
    }
  };

  const handleDimensionsChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, dimensions: value });
    if (errors.dimensions) setErrors({ ...errors, dimensions: '' });
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    if (!quote) {
      calculateQuote();
      toast.info('Please calculate quote first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://lloyds-delivery.onrender.com/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: user?.name || user?.full_name || 'Customer',
          restaurant_id: null,
          restaurant_name: deliveryInfo.label,
          status: 'pending_approval',
          total: quote.total,
          original_total: quote.total,
          delivery_address: formData.delivery_address,
          delivery_fee: quote.total,
          notes: `Pickup: ${formData.pickup_address}\nRecipient: ${formData.recipient_name} (${formData.recipient_phone})\nDescription: ${formData.description}\nWeight: ${formData.weight || 0}kg\nDimensions: ${formData.dimensions || 'N/A'}`,
          payment_status: 'pending_payment',
          payment_transaction_id: null,
          promo_code: null,
          discount_applied: 0,
          required_vehicle_type: (parseFloat(formData.weight) || 0) > 30 ? 'car' : 'bike',
          items: [],
          delivery_type: deliveryType,
          pickup_address: formData.pickup_address,
          recipient_name: formData.recipient_name,
          recipient_phone: formData.recipient_phone,
          package_description: formData.description,
          package_weight: parseFloat(formData.weight) || 0,
          package_dimensions: formData.dimensions,
          requires_signature: formData.requires_signature,
          is_fragile: formData.is_fragile
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      toast.success('Package request submitted! Awaiting admin approval.');
      navigate('/orders');

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{deliveryInfo.label}</h1>
      <p className="text-gray-500 mb-6">Fast and reliable delivery service</p>

      {/* Pricing Rules Disclosure */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">How pricing works</h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>• Base delivery fee: <strong>R{deliveryInfo.basePrice}</strong></p>
                <p>• Weight charge: <strong>R5 per kg</strong> (Max: {deliveryInfo.maxWeight}kg)</p>
                <p>• Signature required: <strong>+R10</strong></p>
                <p>• Fragile item handling: <strong>+R15</strong></p>
                <p className="text-xs mt-2 text-blue-600">Maximum dimensions: {deliveryInfo.maxDimension}cm per side</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Pickup Address */}
        <Card className={`border ${errors.pickup_address ? 'border-red-500' : 'border-gray-200'}`}>
          <CardContent className="p-5">
            <Label className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-green" />
              Pickup Address *
            </Label>
            <Input
              placeholder="Where should we pick up from?"
              value={formData.pickup_address}
              onChange={(e) => {
                setFormData({ ...formData, pickup_address: e.target.value });
                if (errors.pickup_address) setErrors({ ...errors, pickup_address: '' });
              }}
            />
            {errors.pickup_address && <p className="text-xs text-red-500 mt-1">{errors.pickup_address}</p>}
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className={`border ${errors.delivery_address ? 'border-red-500' : 'border-gray-200'}`}>
          <CardContent className="p-5">
            <Label className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              Delivery Address *
            </Label>
            <Input
              placeholder="Where should we deliver to?"
              value={formData.delivery_address}
              onChange={(e) => {
                setFormData({ ...formData, delivery_address: e.target.value });
                if (errors.delivery_address) setErrors({ ...errors, delivery_address: '' });
              }}
            />
            {errors.delivery_address && <p className="text-xs text-red-500 mt-1">{errors.delivery_address}</p>}
          </CardContent>
        </Card>

        {/* Recipient Info - REQUIRED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={`border ${errors.recipient_name ? 'border-red-500' : 'border-gray-200'}`}>
            <CardContent className="p-5">
              <Label className="text-sm">Recipient Name *</Label>
              <Input
                placeholder="Who is receiving?"
                value={formData.recipient_name}
                onChange={(e) => {
                  setFormData({ ...formData, recipient_name: e.target.value });
                  if (errors.recipient_name) setErrors({ ...errors, recipient_name: '' });
                }}
                className="mt-1"
              />
              {errors.recipient_name && <p className="text-xs text-red-500 mt-1">{errors.recipient_name}</p>}
            </CardContent>
          </Card>
          <Card className={`border ${errors.recipient_phone ? 'border-red-500' : 'border-gray-200'}`}>
            <CardContent className="p-5">
              <Label className="text-sm">Recipient Phone *</Label>
              <Input
                placeholder="e.g., 0712345678"
                value={formData.recipient_phone}
                onChange={handlePhoneChange}
                className="mt-1"
                type="tel"
              />
              {errors.recipient_phone && <p className="text-xs text-red-500 mt-1">{errors.recipient_phone}</p>}
              <p className="text-[10px] text-gray-400 mt-1">South African format (e.g., 0712345678)</p>
            </CardContent>
          </Card>
        </div>

        {/* Package Details with Constraints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={`border ${errors.weight ? 'border-red-500' : 'border-gray-200'}`}>
            <CardContent className="p-5">
              <Label className="flex items-center gap-2">
                <Weight className="w-4 h-4 text-green" />
                Weight (kg) <span className="text-xs text-gray-400">(Max: {deliveryInfo.maxWeight}kg)</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g., 2.5"
                value={formData.weight}
                onChange={handleWeightChange}
                onBlur={calculateQuote}
                className="mt-1"
              />
              {errors.weight && <p className="text-xs text-red-500 mt-1">{errors.weight}</p>}
            </CardContent>
          </Card>
          <Card className={`border ${errors.dimensions ? 'border-red-500' : 'border-gray-200'}`}>
            <CardContent className="p-5">
              <Label className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-green" />
                Dimensions (cm) <span className="text-xs text-gray-400">(L x W x H)</span>
              </Label>
              <Input
                placeholder="e.g., 30x20x10"
                value={formData.dimensions}
                onChange={handleDimensionsChange}
                onBlur={calculateQuote}
                className="mt-1"
              />
              {errors.dimensions && <p className="text-xs text-red-500 mt-1">{errors.dimensions}</p>}
              <p className="text-[10px] text-gray-400 mt-1">Max: {deliveryInfo.maxDimension}cm per side</p>
            </CardContent>
          </Card>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_signature}
                  onChange={(e) => { 
                    setFormData({ ...formData, requires_signature: e.target.checked });
                    calculateQuote();
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">📝 Requires Signature (+R10)</span>
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_fragile}
                  onChange={(e) => { 
                    setFormData({ ...formData, is_fragile: e.target.checked });
                    calculateQuote();
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">⚠️ Fragile Item (+R15)</span>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-5">
            <Label>Package Description</Label>
            <Textarea
              placeholder="Describe what you're sending..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Quote & Submission */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-5">
            {quote ? (
              <div className="text-center">
                <p className="text-sm text-gray-600">Estimated Total</p>
                <p className="text-3xl font-bold text-green">R{quote.total.toFixed(2)}</p>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>Base fee: R{deliveryInfo.basePrice}</p>
                  {formData.weight > 0 && <p>Weight charge: R{(parseFloat(formData.weight) * 5).toFixed(2)}</p>}
                  {formData.requires_signature && <p>Signature fee: R10.00</p>}
                  {formData.is_fragile && <p>Fragile handling: R15.00</p>}
                </div>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-4 bg-green text-white w-full"
                >
                  {loading ? 'Processing...' : `Submit Package Request • R${quote.total.toFixed(2)}`}
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  You'll pay after admin approves your request
                </p>
              </div>
            ) : (
              <Button onClick={calculateQuote} className="w-full bg-green text-white">
                Calculate Quote
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}