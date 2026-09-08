import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Clock, Bell, AlertCircle, MapPin, Navigation } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export default function VendorSettings() {
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [settings, setSettings] = useState({
    is_accepting_orders: true,
    max_prep_time: 30,
    auto_accept_orders: false,
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    phone: '',
    address: '',
    latitude: null,
    longitude: null,
    cuisine_type: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      const restaurantRes = await api.get('/vendor/restaurant');
      const settingsRes = await api.get('/vendor/settings').catch(() => ({ data: {} }));
      
      const restaurantData = restaurantRes.data || restaurantRes;
      const settingsData = settingsRes.data || settingsRes;
      
      setRestaurant(restaurantData);
      setRestaurantForm({
        name: restaurantData?.name || '',
        phone: restaurantData?.phone || '',
        address: restaurantData?.address || '',
        latitude: restaurantData?.latitude || null,
        longitude: restaurantData?.longitude || null,
        cuisine_type: restaurantData?.cuisine_type || '',
      });
      setSettings(prev => ({
        ...prev,
        ...settingsData,
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    }
  };

  // ── Validation Functions ──
  const validatePhone = (phone) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) return true;
    if (digits.length === 11 && digits.startsWith('27')) return true;
    if (digits.length === 9) return true;
    return false;
  };

  const validateAccountNumber = (number) => {
    return /^\d+$/.test(number);
  };

  const validateBranchCode = (code) => {
    if (!code) return true;
    return /^\d+$/.test(code);
  };

  // ── Handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Cuisine type: only letters, spaces, and basic punctuation
    if (name === 'cuisine_type') {
      const cleaned = value.replace(/[^a-zA-Z\s\-',&]/g, '');
      setRestaurantForm({ ...restaurantForm, cuisine_type: cleaned });
      if (errors.cuisine_type) setErrors(prev => ({ ...prev, cuisine_type: '' }));
      return;
    }
    
    // Phone validation
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      setRestaurantForm({ ...restaurantForm, phone: digits });
      if (digits && !validatePhone(digits)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid South African phone number' }));
      } else {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
      return;
    }
    
    setRestaurantForm({ ...restaurantForm, [name]: value });
  };

  const handleAddressSelect = (fullAddress, coords) => {
    setRestaurantForm({
      ...restaurantForm,
      address: fullAddress,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
    });
  };

  const openInGoogleMaps = () => {
    if (restaurantForm.latitude && restaurantForm.longitude) {
      window.open(`https://maps.google.com/?q=${restaurantForm.latitude},${restaurantForm.longitude}`, '_blank');
    } else if (restaurantForm.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurantForm.address)}`, '_blank');
    }
  };

  const updateRestaurant = async () => {
    // Validate
    if (restaurantForm.phone && !validatePhone(restaurantForm.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    if (!restaurant?.id) {
      toast.error('Restaurant not found');
      return;
    }
    
    setLoading(true);
    try {
      await api.put(`/restaurants/${restaurant.id}`, restaurantForm);
      toast.success('Restaurant information updated');
      fetchRestaurantData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update restaurant');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      await api.put('/vendor/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Settings error:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle handler with proper state management ──
  const handleToggleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your restaurant and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Restaurant Name</Label>
            <Input
              name="name"
              value={restaurantForm.name}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              name="phone"
              value={restaurantForm.phone}
              onChange={handleChange}
              placeholder="e.g., 0712345678"
              className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">South African format (e.g., 0712345678)</p>
          </div>
          <div>
            <Label>Cuisine Type</Label>
            <Input
              name="cuisine_type"
              value={restaurantForm.cuisine_type}
              onChange={handleChange}
              placeholder="e.g., Burgers, Pizza, Sushi"
              className={`mt-1 ${errors.cuisine_type ? 'border-red-500' : ''}`}
            />
            {errors.cuisine_type && <p className="text-xs text-red-500 mt-1">{errors.cuisine_type}</p>}
            <p className="text-xs text-gray-400 mt-1">Letters, spaces, and basic punctuation only</p>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Restaurant Address
            </Label>
            <AddressAutocomplete
              value={restaurantForm.address}
              onChange={(val) => setRestaurantForm({ ...restaurantForm, address: val })}
              onSelect={handleAddressSelect}
              placeholder="Enter your restaurant address"
            />
            {restaurantForm.latitude && restaurantForm.longitude && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-green-600">✅ Location coordinates saved</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-500"
                  onClick={openInGoogleMaps}
                >
                  <Navigation className="w-3 h-3 mr-1" /> View on Map
                </Button>
              </div>
            )}
          </div>
          <Button onClick={updateRestaurant} disabled={loading} className="bg-green text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Restaurant Info
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Order Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Accepting Orders</p>
              <p className="text-xs text-gray-500">When enabled, customers can place orders</p>
            </div>
            <Switch
              checked={settings.is_accepting_orders}
              onCheckedChange={(val) => handleToggleChange('is_accepting_orders', val)}
            />
          </div>
          <div className="border-t pt-4">
            <Label>Max Preparation Time (minutes)</Label>
            <Input
              type="number"
              value={settings.max_prep_time}
              onChange={(e) => setSettings({ ...settings, max_prep_time: parseInt(e.target.value) })}
              className="mt-1"
              min="5"
              max="120"
            />
            <p className="text-xs text-gray-400 mt-1">Between 5 and 120 minutes</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-accept Orders</p>
              <p className="text-xs text-gray-500">Automatically accept orders</p>
            </div>
            <Switch
              checked={settings.auto_accept_orders}
              onCheckedChange={(val) => handleToggleChange('auto_accept_orders', val)}
            />
          </div>
          <Button onClick={updateSettings} disabled={loading} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save Order Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive order updates via email</p>
            </div>
            <Switch
              checked={true}
              onCheckedChange={(val) => console.log('Email notifications:', val)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-xs text-gray-500">Receive order updates via SMS</p>
            </div>
            <Switch
              checked={false}
              onCheckedChange={(val) => console.log('SMS notifications:', val)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Need help?</p>
            <p className="text-xs text-blue-600 mt-1">
              Contact support at support@lloydsdelivery.co.za
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}