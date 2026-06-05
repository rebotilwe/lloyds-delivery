import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Package, FileText, Truck, Weight, Ruler, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

const deliveryTypes = {
  package: { label: 'Package Delivery', icon: Package, basePrice: 50 },
  document: { label: 'Document Delivery', icon: FileText, basePrice: 35 },
  other: { label: 'Other Delivery', icon: Truck, basePrice: 60 },
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

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const deliveryInfo = deliveryTypes[deliveryType] || deliveryTypes.package;

  const calculateQuote = () => {
    const basePrice = deliveryInfo.basePrice;
    const weightPrice = (parseFloat(formData.weight) || 0) * 5;
    const signatureFee = formData.requires_signature ? 10 : 0;
    const fragileFee = formData.is_fragile ? 15 : 0;
    const total = basePrice + weightPrice + signatureFee + fragileFee;
    setQuote({ total: Math.max(20, total) });
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    if (!formData.pickup_address || !formData.delivery_address) {
      toast.error('Please enter pickup and delivery addresses');
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
          status: 'pending',
          total: quote.total,
          original_total: quote.total,
          delivery_address: formData.delivery_address,
          delivery_fee: quote.total,
          notes: `Pickup: ${formData.pickup_address}\nRecipient: ${formData.recipient_name || 'N/A'} (${formData.recipient_phone || 'N/A'})\nDescription: ${formData.description}\nWeight: ${formData.weight || 0}kg\nDimensions: ${formData.dimensions || 'N/A'}`,
          payment_status: 'pending',
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

      toast.success('Order created! Proceed to payment');
      navigate('/cart', { 
        state: { 
          deliveryType: deliveryType,
          packageDetails: formData
        } 
      });

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

      <div className="space-y-6">
        {/* Pickup Address */}
        <Card>
          <CardContent className="p-5">
            <Label className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-green" />
              Pickup Address *
            </Label>
            <Input
              placeholder="Where should we pick up from?"
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-5">
            <Label className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              Delivery Address *
            </Label>
            <Input
              placeholder="Where should we deliver to?"
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Recipient Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <Label className="text-sm">Recipient Name *</Label>
              <Input
                placeholder="Who is receiving?"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="mt-1"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Label className="text-sm">Recipient Phone</Label>
              <Input
                placeholder="Recipient contact number"
                value={formData.recipient_phone}
                onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                className="mt-1"
              />
            </CardContent>
          </Card>
        </div>

        {/* Package Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <Label className="flex items-center gap-2">
                <Weight className="w-4 h-4 text-green" />
                Weight (kg)
              </Label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g., 2.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="mt-1"
                onBlur={calculateQuote}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Label className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-green" />
                Dimensions (cm)
              </Label>
              <Input
                placeholder="e.g., 30x20x10"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                className="mt-1"
              />
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

        {/* Quote & Payment */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-5">
            {quote ? (
              <div className="text-center">
                <p className="text-sm text-gray-600">Estimated Total</p>
                <p className="text-3xl font-bold text-green">R{quote.total.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Includes delivery fee</p>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-4 bg-green text-white w-full"
                >
                  {loading ? 'Processing...' : `Proceed to Payment • R${quote.total.toFixed(2)}`}
                </Button>
              </div>
            ) : (
              <Button onClick={calculateQuote} className="w-full bg-green text-white">
                Calculate Quote
              </Button>
            )}
            <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Secure payment by Yoco
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}