import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ShoppingBag, DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [stats, setStats] = useState({
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    total_revenue: 0,
    weekly_orders: 0,
    weekly_revenue: 0
  });

  useEffect(() => {
    checkRestaurant();
  }, []);

  const checkRestaurant = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/restaurant');
      if (response.data && response.data.id) {
        setHasRestaurant(true);
        fetchStats();
      } else {
        setHasRestaurant(false);
      }
    } catch (error) {
      console.error('No restaurant found:', error);
      setHasRestaurant(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/vendor/analytics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const goToOnboarding = () => {
    navigate('/vendor/onboarding');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
      </div>
    );
  }

  // Show onboarding prompt if no restaurant
  if (!hasRestaurant) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-green" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome to Vendor Dashboard!</h2>
            <p className="text-gray-500 mb-4">
              You're approved! Now let's set up your restaurant to start receiving orders.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-blue-800 mb-2">What you'll need:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Restaurant name and description</li>
                <li>• Physical address for pickup</li>
                <li>• Operating hours</li>
                <li>• Delivery radius and fees</li>
              </ul>
            </div>
            <Button onClick={goToOnboarding} className="bg-green text-white">
              Set Up Restaurant →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's your business overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-bold text-green">R{stats.today_revenue?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-400">{stats.today_orders || 0} orders</p>
              </div>
              <DollarSign className="w-8 h-8 text-green opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders || 0}</p>
                <p className="text-xs text-gray-400">Awaiting action</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">R{stats.total_revenue?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-400">All time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button 
          onClick={() => navigate('/vendor/orders')} 
          variant="outline" 
          className="h-20 flex flex-col gap-1"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>View Orders</span>
          {stats.pending_orders > 0 && (
            <span className="text-xs text-yellow-600">{stats.pending_orders} pending</span>
          )}
        </Button>
        <Button 
          onClick={() => navigate('/vendor/menu')} 
          variant="outline" 
          className="h-20 flex flex-col gap-1"
        >
          <Store className="w-5 h-5" />
          <span>Manage Menu</span>
        </Button>
      </div>
    </div>
  );
}