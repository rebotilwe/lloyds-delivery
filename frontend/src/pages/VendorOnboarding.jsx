import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Store, MapPin, Phone, Clock, DollarSign, Ruler, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    phone: '',
    operating_hours_open: '09:00',
    operating_hours_close: '21:00',
    delivery_radius: 10,
    min_order_amount: 50,
    delivery_fee: 20,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.name || !formData.address) {
    toast.error('Please fill in restaurant name and address');
    return;
  }

  setLoading(true);
  try {
    const response = await api.post('/vendor/setup-restaurant', {
      name: formData.name,
      description: formData.description,
      cuisine_type: formData.cuisine_type,
      address: formData.address,
      phone: formData.phone,
      operating_hours: {
        open: formData.operating_hours_open,
        close: formData.operating_hours_close
      },
      delivery_radius: Number(formData.delivery_radius),
      min_order_amount: Number(formData.min_order_amount),
      delivery_fee: Number(formData.delivery_fee),
    });

    if (response.data.success) {
      toast.success('Restaurant created successfully!');
      // Navigate to vendor menu page after successful setup
      navigate('/vendor/menu');
    }
  } catch (error) {
    console.error('Setup error:', error);
    toast.error(error.response?.data?.message || 'Failed to setup restaurant');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-green" />
          </div>
          <h1 className="text-2xl font-bold">Welcome! Let's set up your restaurant</h1>
          <p className="text-gray-500 text-sm mt-1">Tell us about your business to start receiving orders</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Restaurant Name */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4" />
                  Restaurant Name *
                </Label>
                <Input
                  name="name"
                  placeholder="e.g., Kota King, Burger Palace"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  name="description"
                  placeholder="Tell customers about your restaurant..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {/* Cuisine Type */}
              <div>
                <Label>Cuisine Type</Label>
                <Input
                  name="cuisine_type"
                  placeholder="e.g., Fast Food, Pizza, Sushi, Burgers"
                  value={formData.cuisine_type}
                  onChange={handleChange}
                />
              </div>

              {/* Address */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" />
                  Restaurant Address *
                </Label>
                <Input
                  name="address"
                  placeholder="Full street address, city, postal code"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4" />
                  Contact Phone
                </Label>
                <Input
                  name="phone"
                  placeholder="+27 XX XXX XXXX"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    Opening Time
                  </Label>
                  <Input
                    type="time"
                    name="operating_hours_open"
                    value={formData.operating_hours_open}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    Closing Time
                  </Label>
                  <Input
                    type="time"
                    name="operating_hours_close"
                    value={formData.operating_hours_close}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-2 mb-1">
                    <Ruler className="w-4 h-4" />
                    Delivery Radius (km)
                  </Label>
                  <Input
                    type="number"
                    name="delivery_radius"
                    value={formData.delivery_radius}
                    onChange={handleChange}
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4" />
                    Min Order Amount (R)
                  </Label>
                  <Input
                    type="number"
                    name="min_order_amount"
                    value={formData.min_order_amount}
                    onChange={handleChange}
                    min="0"
                    step="10"
                  />
                </div>
              </div>

              {/* Delivery Fee */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Delivery Fee (R)
                </Label>
                <Input
                  type="number"
                  name="delivery_fee"
                  value={formData.delivery_fee}
                  onChange={handleChange}
                  min="0"
                  step="5"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This fee goes to the driver. You can change this later.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  💡 Tip: After setup, you can add your menu items and start accepting orders!
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green text-white h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}