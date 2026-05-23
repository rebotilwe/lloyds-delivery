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
  Star,
  TrendingUp,
  Phone,
  Navigation as NavigateIcon,
  RefreshCw,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOrderStatus } from '@/lib/utils';
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

// Helper for class names
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Helper to calculate distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper to estimate delivery time based on distance
function estimateDeliveryTime(distanceKm) {
  if (!distanceKm) return null;
  const avgSpeed = 30; // km/h in city
  const minutes = Math.ceil((distanceKm / avgSpeed) * 60);
  return minutes;
}

export default function DriverDashboard() {
  const { socket, online } = useSocket();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [declinedOrders, setDeclinedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeclined, setShowDeclined] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState({ lat: null, lng: null });
  const [expandedOrders, setExpandedOrders] = useState({});
  const [restaurantDistances, setRestaurantDistances] = useState({});

  // LOAD USER
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  // Load declined orders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('declined_orders');
    if (saved) {
      try {
        setDeclinedOrders(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save declined orders to localStorage
  useEffect(() => {
    localStorage.setItem('declined_orders', JSON.stringify(declinedOrders));
  }, [declinedOrders]);

  // Calculate distances for available orders
  useEffect(() => {
    if (availableOrders.length > 0 && driverLocation.lat && driverLocation.lng) {
      const distances = {};
      availableOrders.forEach(order => {
        // Use restaurant coordinates if available, otherwise estimate
        const restaurantLat = order.restaurant_lat || -29.65;
        const restaurantLng = order.restaurant_lng || 31.05;
        const distance = calculateDistance(
          driverLocation.lat, driverLocation.lng,
          restaurantLat, restaurantLng
        );
        distances[order.id] = distance;
      });
      setRestaurantDistances(distances);
    }
  }, [availableOrders, driverLocation]);

  // Location tracking
  useEffect(() => {
    if (navigator.geolocation && isAvailable) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });
          
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
          if (error.code === 1) {
            toast.error('Please enable location services to track deliveries');
          }
        },
        { enableHighAccuracy: true, interval: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isAvailable, trackingOrder, socket, online]);

  // Socket connection
  useEffect(() => {
    if (socket && user?.id && online) {
      socket.emit('join-driver', user.id);

      socket.on('order-offered', (data) => {
        // Don't show if already declined
        if (declinedOrders.includes(data.orderId)) return;
        
        console.log('New order offered:', data);
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Delivery Offer!', {
            body: `Order #${data.orderId} from ${data.restaurantName} - R${data.orderTotal}`,
            icon: '/logo.png',
            tag: `order-${data.orderId}`,
          });
        }
        
        toast.info(`📦 New order #${data.orderId} offered to you!`);
        fetchOrders();
      });

      socket.on('earnings-updated', (data) => {
        toast.success(`💰 You earned R${data.earning.toFixed(2)} for order #${data.orderId}`);
        fetchOrders();
        fetchUserData();
      });

      return () => {
        socket.off('order-offered');
        socket.off('earnings-updated');
      };
    }
  }, [socket, user, online, declinedOrders]);

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

  const fetchOrders = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const res1 = await fetch('https://lloyds-delivery.onrender.com/api/orders/available');
      let available = await res1.json();
      // Filter out declined orders
      available = available.filter(order => !declinedOrders.includes(order.id));
      setAvailableOrders(Array.isArray(available) ? available : []);

      const res2 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/${user.id}`);
      const mine = await res2.json();
      setMyOrders(Array.isArray(mine) ? mine : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [user, declinedOrders]);

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
      setTrackingOrder(orderId);
    } catch (err) {
      console.error(err);
      toast.error('Error accepting order');
    }
  };

  const declineOrder = (orderId, orderName) => {
    if (window.confirm(`Decline order #${orderId} from ${orderName}? You won't see this order again.`)) {
      setDeclinedOrders(prev => [...prev, orderId]);
      setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
      toast.info(`Order #${orderId} declined`);
    }
  };

  const clearDeclinedOrders = () => {
    if (window.confirm('Clear all declined orders? They may reappear if offered again.')) {
      setDeclinedOrders([]);
      toast.success('Declined orders cleared');
      fetchOrders();
    }
  };

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

      const statusMessages = {
        ready_for_pickup: 'Restaurant notified! Ready for pickup soon',
        picked_up: 'Food collected! Starting delivery',
        on_the_way: 'On the way to customer!',
        delivered: 'Order delivered! Payment received',
      };
      
      toast.success(statusMessages[nextStatus] || 'Status updated');
      
      if (nextStatus === 'on_the_way') setTrackingOrder(orderId);
      if (nextStatus === 'delivered') setTrackingOrder(null);
      
      fetchOrders();
      if (nextStatus === 'delivered') await fetchUserData();
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

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const formatAddress = (address) => {
    if (!address) return 'No address provided';
    if (address.length > 40) return address.substring(0, 40) + '...';
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

  const totalEarnings = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + (Number(order.driver_earning) || 0), 0);
  }, [completedOrders]);

  const weeklyEarnings = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return completedOrders
      .filter(order => new Date(order.created_at) > oneWeekAgo)
      .reduce((sum, order) => sum + (Number(order.driver_earning) || 0), 0);
  }, [completedOrders]);

  const averageRating = useMemo(() => {
    const ratedOrders = completedOrders.filter(o => o.driver_rating);
    if (ratedOrders.length === 0) return 0;
    const sum = ratedOrders.reduce((acc, o) => acc + (o.driver_rating || 0), 0);
    return (sum / ratedOrders.length).toFixed(1);
  }, [completedOrders]);

  const openGoogleMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Welcome back, {user?.name || 'Driver'}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={fetchOrders} variant="outline" size="sm" disabled={refreshing} className="text-xs">
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs text-gray-500">Available</span>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {online ? '🟢 Live Updates Active' : '🔴 Connecting...'}
        </span>
        {trackingOrder && (
          <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">
            📍 Tracking order #{trackingOrder}
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Active" value={activeOrders.length} icon={Package} color="bg-blue-500" />
        <StatCard label="Available" value={availableOrders.length} icon={Clock} color="bg-orange-500" />
        <StatCard label="Completed" value={completedOrders.length} icon={CheckCircle2} color="bg-green-500" />
        <StatCard label="Earnings" value={`R${totalEarnings.toFixed(2)}`} icon={DollarSign} color="bg-purple-500" />
        <StatCard label="Rating" value={averageRating > 0 ? `${averageRating}★` : '—'} icon={Star} color="bg-yellow-500" />
      </div>

      {/* Weekly Summary Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green" />
            <div>
              <p className="text-xs text-gray-500">This Week's Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-green">R{weeklyEarnings.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className="text-base sm:text-lg font-semibold">
              {myOrders.length > 0 
                ? `${Math.round((completedOrders.length / myOrders.length) * 100)}%`
                : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Deliveries */}
      {activeOrders.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-sm sm:text-base font-bold mb-3 sm:mb-4">Active Deliveries ({activeOrders.length})</h2>
          <div className="space-y-3 sm:space-y-4">
            {activeOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{order.restaurant_name || 'Restaurant'}</p>
                      <p className="text-xs text-gray-500">Order #{order.id} • {order.customer_name || 'Customer'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Status: <span className="font-medium">{formatOrderStatus(order.status)}</span>
                      </p>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-green shrink-0 ml-2">
                      R{Number(order.total).toFixed(2)}
                    </span>
                  </div>

                  {/* Delivery Address with Map Button */}
                  <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{formatAddress(order.delivery_address)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 sm:h-8 text-xs shrink-0"
                      onClick={() => openGoogleMaps(order.delivery_address)}
                    >
                      <NavigateIcon className="w-3 h-3 mr-1" />
                      Navigate
                    </Button>
                  </div>

                  {/* Customer Contact */}
                  {order.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      <a href={`tel:${order.customer_phone}`} className="text-xs sm:text-sm text-blue-600 hover:underline">
                        {order.customer_phone}
                      </a>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    className="w-full bg-green hover:bg-green/90 text-white text-sm h-9 sm:h-10"
                    onClick={() => handleOrderAction(order)}
                  >
                    {getButtonText(order)}
                  </Button>

                  {/* Expandable Items */}
                  {order.items && order.items.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="flex items-center justify-between w-full text-xs text-gray-500 pt-2"
                      >
                        <span>{expandedOrders[order.id] ? 'Hide' : 'View'} order details</span>
                        {expandedOrders[order.id] ? '▲' : '▼'}
                      </button>
                      {expandedOrders[order.id] && (
                        <div className="space-y-1 pt-2 border-t">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span>{item.quantity}x {item.name}</span>
                              <span>R{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs pt-1 border-t">
                            <span>Delivery fee</span>
                            <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Orders */}
      <div className="mb-6 sm:mb-8">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-bold">Available Orders ({availableOrders.length})</h2>
          {declinedOrders.length > 0 && (
            <button onClick={clearDeclinedOrders} className="text-xs text-red-500 hover:underline">
              Clear Declined ({declinedOrders.length})
            </button>
          )}
        </div>
        
        {availableOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No available orders</p>
              <p className="text-xs text-gray-400 mt-1">Check back later for delivery requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => {
              const distance = restaurantDistances[order.id];
              const estimatedTime = distance ? estimateDeliveryTime(distance) : null;
              
              return (
                <Card key={order.id} className="hover:shadow-md transition">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate">{order.restaurant_name || 'Restaurant'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Order #{order.id} • {order.customer_name || 'Customer'} • {getItemCountText(order)}
                        </p>
                        <div className="flex items-start gap-1 mt-2">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-500 truncate">{formatAddress(order.delivery_address)}</p>
                        </div>
                        
                        {/* Distance & Time Estimate */}
                        {distance && (
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              📍 {distance.toFixed(1)} km away
                            </span>
                            {estimatedTime && (
                              <span className="text-xs text-green-600">
                                ⏱️ ~{estimatedTime} min
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          Delivery Fee: R{Number(order.delivery_fee || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center gap-2">
                        <p className="font-bold text-green text-base sm:text-lg">R{Number(order.total).toFixed(2)}</p>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => acceptOrder(order.id)}
                            className="bg-green hover:bg-green/90 text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                          >
                            Accept
                          </Button>
                          <Button 
                            onClick={() => declineOrder(order.id, order.restaurant_name)}
                            variant="outline"
                            className="border-red-300 text-red-500 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Declined Orders History */}
      {declinedOrders.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowDeclined(!showDeclined)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mb-2"
          >
            <AlertCircle className="w-3 h-3" />
            {showDeclined ? 'Hide' : 'Show'} Declined Orders ({declinedOrders.length})
          </button>
          
          {showDeclined && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500 mb-2">Orders you've declined:</p>
                <div className="flex flex-wrap gap-2">
                  {declinedOrders.map(id => (
                    <span key={id} className="text-xs bg-gray-200 px-2 py-1 rounded-full">#{id}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Delivery History */}
      {completedOrders.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : `Show Delivery History (${completedOrders.length})`}
          </button>

          {showHistory && (
            <div className="space-y-2">
              {completedOrders.map((order) => (
                <Card key={order.id} className="bg-gray-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{order.restaurant_name}</p>
                        <p className="text-xs text-gray-500">Order #{order.id}</p>
                        <p className="text-xs text-gray-400">
                          Delivered {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.driver_rating && (
                          <p className="text-xs text-yellow-600 mt-1">Rating: {order.driver_rating}★</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green text-sm">R{Number(order.total).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Earned: R{Number(order.driver_earning || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Link */}
      <div className="mt-6 text-center">
        <Link to="/profile">
          <Button variant="outline" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            View Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Simplified Stat Card Component
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
        <div className={cn("p-1.5 sm:p-2 rounded-lg", color)}>
          <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm sm:text-base font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getItemCountText(order) {
  const count = order.items?.length || order.items_count || 0;
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}