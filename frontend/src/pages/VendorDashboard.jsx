import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold mt-1">{value ?? 0}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </CardContent>
  </Card>
);

const API_URL = 'https://lloyds-delivery.onrender.com/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export default function VendorDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [analytics, setAnalytics] = useState({
    today: { orders: 0, revenue: 0 },
    pending: 0,
    weekly: { orders: 0, revenue: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      const [restaurantRes, analyticsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/vendor/restaurant`, { headers }),
        fetch(`${API_URL}/vendor/analytics`, { headers }),
        fetch(`${API_URL}/vendor/orders`, { headers }),
      ]);

      const restaurantData = await restaurantRes.json();
      const analyticsData = await analyticsRes.json();
      const ordersData = await ordersRes.json();

      setRestaurant(restaurantData);
      
      // Safely set analytics with fallback values
      setAnalytics({
        today: {
          orders: analyticsData?.today?.orders ?? 0,
          revenue: analyticsData?.today?.revenue ?? 0
        },
        pending: analyticsData?.pending ?? 0,
        weekly: {
          orders: analyticsData?.weekly?.orders ?? 0,
          revenue: analyticsData?.weekly?.revenue ?? 0
        }
      });
      
      setRecentOrders(Array.isArray(ordersData) ? ordersData.slice(0, 5) : []);
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-800' },
      ready_for_pickup: { label: 'Ready', color: 'bg-green-100 text-green-800' },
      picked_up: { label: 'Picked Up', color: 'bg-indigo-100 text-indigo-800' },
      on_the_way: { label: 'On The Way', color: 'bg-cyan-100 text-cyan-800' },
      delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {restaurant?.name || 'Restaurant Owner'}
          </p>
        </div>
        <Button onClick={fetchVendorData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - with safe fallbacks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Orders"
          value={analytics.today.orders}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard
          title="Today's Revenue"
          value={`R${analytics.today.revenue.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Orders"
          value={analytics.pending}
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          title="Weekly Orders"
          value={analytics.weekly.orders}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => window.location.href = '/vendor/orders'} className="bg-green text-white">
              View Orders
            </Button>
            <Button onClick={() => window.location.href = '/vendor/menu'} variant="outline">
              Manage Menu
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurant Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm">Online - Accepting Orders</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {restaurant?.address || 'Address not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">
                      {order.created_at ? format(new Date(order.created_at), 'dd MMM, h:mm a') : '-'}
                    </p>
                    <p className="text-sm mt-1">{order.customer_name || 'Guest'}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <p className="font-bold text-green mt-1">R{Number(order.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}