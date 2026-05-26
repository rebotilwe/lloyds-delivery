import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Clock, Bell, Truck, AlertCircle } from 'lucide-react';

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
  });

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      const [restaurantRes, settingsRes] = await Promise.all([
        api.get('/vendor/restaurant'),
        api.get('/vendor/settings').catch(() => ({ data: {} })),
      ]);
      
      setRestaurant(restaurantRes.data);
      setRestaurantForm({
        name: restaurantRes.data.name || '',
        phone: restaurantRes.data.phone || '',
        address: restaurantRes.data.address || '',
      });
      setSettings(prev => ({
        ...prev,
        ...settingsRes.data,
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    }
  };

  const updateRestaurant = async () => {
    setLoading(true);
    try {
      await api.put(`/restaurants/${restaurant?.id}`, restaurantForm);
      toast.success('Restaurant information updated');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your restaurant and account settings</p>
      </div>

      {/* Restaurant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Restaurant Name</Label>
            <Input
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={restaurantForm.phone}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
              placeholder="e.g., 011 123 4567"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={restaurantForm.address}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
              className="mt-1"
            />
          </div>
          <Button onClick={updateRestaurant} disabled={loading} className="bg-green text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Restaurant Info
          </Button>
        </CardContent>
      </Card>

      {/* Order Settings */}
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
              <p className="text-xs text-gray-500">When enabled, customers can place orders from your restaurant</p>
            </div>
            <Switch
              checked={settings.is_accepting_orders}
              onCheckedChange={(val) => setSettings({ ...settings, is_accepting_orders: val })}
            />
          </div>
          <div className="border-t pt-4">
            <Label>Maximum Preparation Time (minutes)</Label>
            <Input
              type="number"
              value={settings.max_prep_time}
              onChange={(e) => setSettings({ ...settings, max_prep_time: parseInt(e.target.value) })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated time shown to customers
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-accept Orders</p>
              <p className="text-xs text-gray-500">Automatically accept orders without manual confirmation</p>
            </div>
            <Switch
              checked={settings.auto_accept_orders}
              onCheckedChange={(val) => setSettings({ ...settings, auto_accept_orders: val })}
            />
          </div>
          <Button onClick={updateSettings} disabled={loading} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save Order Settings
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-xs text-gray-500">Receive order updates via SMS</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Need help?</p>
            <p className="text-xs text-blue-600 mt-1">
              Contact support at support@lloydsdelivery.co.za or call +27 00 000 0000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}