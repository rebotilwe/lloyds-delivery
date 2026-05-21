import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  History,
  DollarSign,
  Navigation,
  Bell,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';

// STATUS FLOW - maps current status to next status
const STATUS_FLOW = {
  pending: 'confirmed',
  confirmed: 'ready_for_pickup',
  ready_for_pickup: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

// STATUS LABELS - maps current status to button text
const STATUS_LABELS = {
  pending: 'Accept Order',
  confirmed: 'Mark Ready',
  ready_for_pickup: 'Pick Up Order',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

export default function DriverDashboard() {
  const { socket, online } = useSocket();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState({ lat: null, lng: null });

  // LOAD USER
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  // Location tracking
  useEffect(() => {
    if (navigator.geolocation && isAvailable && trackingOrder) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });
          
          // Emit location to socket for customer tracking
          if (socket && online && trackingOrder) {
            socket.emit('driver-location', {
              orderId: trackingOrder,
              lat: latitude,
              lng: longitude,
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true, interval: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isAvailable, trackingOrder, socket, online]);

  // Socket connection - Join driver room
  useEffect(() => {
    if (socket && user?.id && online) {
      console.log('Driver joining room:', user.id);
      socket.emit('join-driver', user.id);

      // Listen for new order assignments
      socket.on('order-assigned', (data) => {
        console.log('New order assigned:', data);
        // Play sound notification (if supported)
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {}
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order Available!', {
            body: `Order #${data.orderId} from ${data.restaurantName}`,
            icon: '/logo.png',
          });
        }
        
        toast.info(`📦 New order #${data.orderId} assigned to you!`);
        fetchOrders();
      });

      // Listen for earnings updates
      socket.on('earnings-updated', (data) => {
        console.log('Earnings updated:', data);
        toast.success(`💰 You earned R${data.earning.toFixed(2)} for order #${data.orderId}`);
        fetchOrders();
        // Refresh user data
        fetchUserData();
      });

      return () => {
        socket.off('order-assigned');
        socket.off('earnings-updated');
      };
    }
  }, [socket, user, online]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`https://lloyds-delivery.onrender.com/api/users/${user.id}`);
      const freshUser = await res.json();
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // FETCH ORDERS
  const fetchOrders = async () => {
    if (!user) return;

    try {
      const res1 = await fetch('https://lloyds-delivery.onrender.com/api/orders/available');
      const available = await res1.json();
      setAvailableOrders(Array.isArray(available) ? available : []);

      const res2 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/${user.id}`);
      const mine = await res2.json();
      setMyOrders(Array.isArray(mine) ? mine : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setAvailableOrders([]);
      setMyOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // ACCEPT ORDER
  const acceptOrder = async (orderId) => {
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/accept/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to accept order');

      toast.success('Order accepted! Head to the restaurant');
      fetchOrders();
      
      // Start tracking this order
      setTrackingOrder(orderId);
    } catch (err) {
      console.error(err);
      toast.error('Error accepting order');
    }
  };

  // UPDATE STATUS
  const updateStatus = async (orderId, currentStatus) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) {
      toast.error('Cannot update this order status');
      return;
    }

    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      if (nextStatus === 'ready_for_pickup') {
        toast.success('Restaurant notified! Ready for pickup soon');
      } else if (nextStatus === 'picked_up') {
        toast.success('Food collected! Starting delivery');
      } else if (nextStatus === 'on_the_way') {
        toast.success('On the way to customer!');
        // Continue tracking
        setTrackingOrder(orderId);
      } else if (nextStatus === 'delivered') {
        toast.success('Order delivered! Payment received');
        setTrackingOrder(null);
        await fetchUserData();
      } else {
        toast.success('Status updated');
      }

      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error('Error updating status');
    }
  };

  const getButtonText = (order) => {
    if (order.status === 'pending') return 'Accept Order';
    return STATUS_LABELS[order.status] || 'Update Status';
  };

  const handleOrderAction = (order) => {
    if (order.status === 'pending') {
      acceptOrder(order.id);
    } else {
      updateStatus(order.id, order.status);
    }
  };

  const getItemCount = (order) => {
    if (order.items && Array.isArray(order.items)) return order.items.length;
    if (order.items && typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        return parsed.length;
      } catch (e) {
        return 0;
      }
    }
    if (order.items_count) return order.items_count;
    return 0;
  };

  const getItemCountText = (order) => {
    const count = getItemCount(order);
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  };

  const formatAddress = (address) => {
    if (!address) return 'No address provided';
    if (/^\d+$/.test(address) && address.length < 10) {
      return `Address: ${address}`;
    }
    return address;
  };

  const activeOrders = useMemo(
    () => myOrders.filter((o) =>
      ['confirmed', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(o.status)
    ),
    [myOrders]
  );

  const completedOrders = useMemo(
    () => myOrders.filter((o) => o.status === 'delivered'),
    [myOrders]
  );

  // Calculate total earnings
  const totalEarnings = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + (Number(order.driver_earning) || 0), 0);
  }, [completedOrders]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name || 'Driver'}</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm">
          <span className="text-sm text-gray-500">Available for deliveries</span>
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </div>
      </div>

      {/* Profile Button */}
      <div className="mb-4 flex justify-end">
        <Link to="/profile">
          <Button variant="outline" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            My Profile
          </Button>
        </Link>
      </div>

      {/* Status Indicators */}
      <div className="flex justify-between items-center mb-4">
        <span className={`text-xs px-2 py-1 rounded-full ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {online ? '🟢 Live Updates Active' : '🔴 Connecting...'}
        </span>
        {trackingOrder && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">
            📍 Tracking order #{trackingOrder}
          </span>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Active Deliveries" value={activeOrders.length} icon={Package} />
        <Stat label="Available Orders" value={availableOrders.length} icon={Clock} />
        <Stat label="Completed" value={completedOrders.length} icon={CheckCircle2} />
        <Stat
          label="Total Earnings"
          value={`R${totalEarnings.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Toggle History */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide History' : 'Show Delivery History'}
        </button>
      </div>

      {/* DELIVERY HISTORY */}
      {showHistory && completedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-4">Delivery History</h2>
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <Card key={order.id} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{order.restaurant_name}</p>
                      <p className="text-sm text-gray-500">Order #{order.id}</p>
                      <p className="text-xs text-gray-400">
                        Delivered on {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green">R{Number(order.total).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Earned: R{Number(order.driver_earning || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE ORDERS SECTION */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-4">Active Deliveries</h2>
          {activeOrders.map((order) => (
            <Card key={order.id} className="mb-4">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{order.restaurant_name || 'Restaurant'}</p>
                    <p className="text-sm text-gray-500">
                      Order #{order.id} • {order.customer_name || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Status: <span className="font-medium capitalize">{order.status?.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                  <span className="text-lg font-bold text-green">
                    R{Number(order.total).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <MapPin className="w-4 h-4" />
                  {formatAddress(order.delivery_address)}
                </div>

                {order.driver_earning > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    Your earnings: R{Number(order.driver_earning).toFixed(2)}
                  </p>
                )}

                <Button
                  className="mt-4 w-full bg-green hover:bg-green/90 text-white"
                  onClick={() => handleOrderAction(order)}
                >
                  {getButtonText(order)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AVAILABLE ORDERS SECTION */}
      <div>
        <h2 className="font-bold text-lg mb-4">Available Orders</h2>
        {availableOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No available orders at the moment</p>
              <p className="text-sm mt-1">Check back later for delivery requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-semibold">{order.restaurant_name || 'Restaurant'}</p>
                    <p className="text-sm text-gray-500">
                      {order.customer_name || 'Customer'} • {getItemCountText(order)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{formatAddress(order.delivery_address)}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-green">R{Number(order.total).toFixed(2)}</p>
                    <Button 
                      onClick={() => acceptOrder(order.id)}
                      className="mt-2 bg-green hover:bg-green/90 text-white"
                      size="sm"
                    >
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// STAT COMPONENT
function Stat({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-green/10 rounded-lg">
          <Icon className="w-5 h-5 text-green" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}