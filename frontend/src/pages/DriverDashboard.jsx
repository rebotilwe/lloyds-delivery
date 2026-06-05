import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Wallet,
  CreditCard,
  Banknote,
  Bike,
  Car,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOrderStatus } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

// Helper to calculate distance (Haversine formula) - for display only
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
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
  const avgSpeed = 30;
  const minutes = Math.ceil((distanceKm / avgSpeed) * 60);
  return minutes;
}

// Helper to format phone number for WhatsApp
const formatWhatsAppNumber = (phone) => {
  if (!phone) return '#';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('27')) {
    cleaned = '27' + cleaned;
  }
  return cleaned;
};

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
  const [dataLoaded, setDataLoaded] = useState(false);

  // Package Offer States
  const [packageOffer, setPackageOffer] = useState(null);
  const [showPackageOfferModal, setShowPackageOfferModal] = useState(false);
  const [acceptingPackage, setAcceptingPackage] = useState(false);

  // WITHDRAWAL STATES
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState({
    pending_balance: 0,
    available_balance: 0,
    total_earned: 0,
    total_paid: 0,
    pending_payout: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
  });

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num) ? num.toFixed(2) : '0.00';
  };

  // LOAD USER
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsedUser = JSON.parse(stored);
      setUser(parsedUser);
      console.log('Driver user loaded:', parsedUser);
    } else if (authUser) {
      setUser(authUser);
      console.log('Driver user from auth:', authUser);
    }
  }, [authUser]);

  // Fetch orders when user is available
  useEffect(() => {
    if (user && user.id) {
      console.log('User loaded, fetching orders...');
      fetchOrders();
      fetchEarningsData();
      fetchWithdrawalHistory();
      fetchBankDetails();
    } else {
      const timer = setTimeout(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && !user) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

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

  // Socket connection for order offers and package offers
  useEffect(() => {
    if (socket && user?.id && online) {
      socket.emit('join-driver', user.id);
      console.log('Driver joined socket room:', user.id);

      socket.on('order-offered', (data) => {
        if (declinedOrders.includes(data.orderId)) return;
        
        console.log('New order offered:', data);
        
        if (data.requiredVehicle === 'car' && user?.vehicle_type === 'bike') {
          console.log('Order requires car, but driver has bike - ignoring');
          return;
        }
        
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

      // Package offer listener
      socket.on('new-package-offer', (data) => {
        console.log('📦 New package offer:', data);
        setPackageOffer(data);
        setShowPackageOfferModal(true);
        
        toast.info(`📦 Package Delivery! - R${data.estimatedPay?.toFixed(2)}`, {
          duration: 30000,
          action: {
            label: "Accept",
            onClick: () => acceptPackageOffer(data.orderId)
          }
        });
      });

      socket.on('package-offer-taken', (data) => {
        toast.info(`Package #${data.orderId} has been taken by another driver`);
        if (packageOffer?.orderId === data.orderId) {
          setShowPackageOfferModal(false);
        }
      });

      socket.on('earnings-updated', (data) => {
        toast.success(`💰 You earned R${formatCurrency(data.earning)} for order #${data.orderId}`);
        fetchOrders();
        fetchUserData();
        fetchEarningsData();
      });

      return () => {
        socket.off('order-offered');
        socket.off('new-package-offer');
        socket.off('package-offer-taken');
        socket.off('earnings-updated');
      };
    }
  }, [socket, user, online, declinedOrders, packageOffer]);

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
const fetchOrders = useCallback(async () => {
  if (!user?.id) {
    console.log('No user ID available, skipping fetch');
    return;
  }
  
  setRefreshing(true);
  console.log('Fetching orders for driver:', user.id, 'Vehicle:', user.vehicle_type);
  
  try {
    const res1 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/available?driver_id=${user.id}`);
    let available = await res1.json();
    console.log('Available orders API response:', available);
    
    // FIX: Check if available is an array before filtering
    if (!Array.isArray(available)) {
      console.error('Available orders is not an array:', available);
      available = [];
    }
    
    // Only filter if available is an array
    const filteredAvailable = available.filter(order => !declinedOrders.includes(order.id));
    setAvailableOrders(filteredAvailable);

    const res2 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/${user.id}`);
    const mine = await res2.json();
    console.log('My orders API response:', mine);
    
    // FIX: Check if mine is an array
    if (!Array.isArray(mine)) {
      console.error('My orders is not an array:', mine);
      setMyOrders([]);
    } else {
      if (mine.length > 0) {
        console.log('Sample order customer_phone:', mine[0].customer_phone);
        console.log('Sample order customer_name:', mine[0].customer_name);
      }
      setMyOrders(mine);
    }
    
    setDataLoaded(true);
    
  } catch (err) {
    console.error('Error fetching orders:', err);
    // Set empty arrays on error to prevent crashes
    setAvailableOrders([]);
    setMyOrders([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [user, declinedOrders]);

  // Accept package offer
  const acceptPackageOffer = async (orderId) => {
    setAcceptingPackage(true);
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/accept-package/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      toast.success('Package accepted! Check your active deliveries');
      setShowPackageOfferModal(false);
      setPackageOffer(null);
      fetchOrders();
      setIsAvailable(false);
      
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to accept package');
    } finally {
      setAcceptingPackage(false);
    }
  };

  const fetchEarningsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/earnings-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const summary = data.summary || {};
      
      setEarningsSummary({
        pending_balance: parseFloat(summary.pending_balance) || 0,
        available_balance: parseFloat(summary.available_balance) || 0,
        total_earned: parseFloat(summary.total_earned) || 0,
        total_paid: parseFloat(summary.withdrawn_total) || 0,
        pending_payout: parseFloat(summary.pending_payout) || 0
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/withdrawal-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const fixedData = (data || []).map(item => ({
        ...item,
        amount: parseFloat(item.amount) || 0,
        requested_at: item.requested_at || item.created_at
      }));
      setWithdrawalHistory(fixedData);
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
      setWithdrawalHistory([]);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/bank-details', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const saveBankDetails = async () => {
    if (!bankDetails.bank_name || !bankDetails.account_number || !bankDetails.account_holder) {
      toast.error('Please fill in bank name, account holder, and account number');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bankDetails)
      });
      
      if (!res.ok) throw new Error('Failed to save bank details');
      
      toast.success('Bank details saved successfully');
    } catch (err) {
      toast.error('Failed to save bank details');
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount < 50) {
      toast.error('Minimum withdrawal amount is R50');
      return;
    }
    
    if (amount > (earningsSummary?.available_balance || 0)) {
      toast.error(`Insufficient balance. Available: R${formatCurrency(earningsSummary?.available_balance)}`);
      return;
    }
    
    setLoadingWithdraw(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/request-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          bank_name: bankDetails.bank_name,
          account_holder: bankDetails.account_holder,
          account_number: bankDetails.account_number,
          branch_code: bankDetails.branch_code
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchEarningsData();
      fetchWithdrawalHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoadingWithdraw(false);
    }
  };

  // Check for active orders and prevent accepting new ones
  const hasActiveOrder = useMemo(() => {
    return myOrders.some(order => 
      ['picked_up', 'on_the_way', 'assigned'].includes(order.status)
    );
  }, [myOrders]);

  const acceptOrder = async (orderId) => {
    if (hasActiveOrder) {
      toast.error('Complete your current delivery first');
      return;
    }
    
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/accept/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: user.id }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.message && data.message.includes('requires a car')) {
          toast.error('This order requires a car. Only car drivers can accept it.');
        } else {
          toast.error(data.message || 'Failed to accept order');
        }
        return;
      }

      toast.success('Order accepted! Head to the restaurant');
      fetchOrders();
      setTrackingOrder(orderId);
      setIsAvailable(false);
      
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
      
      if (nextStatus === 'delivered') {
        setTrackingOrder(null);
        setIsAvailable(true);
        toast.success('You are now back online and can accept new orders');
        fetchEarningsData();
      }
      
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
      ['confirmed', 'ready_for_pickup', 'picked_up', 'on_the_way', 'assigned'].includes(o.status)
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

  // Show loading skeleton while data is being fetched
  if (loading && !dataLoaded) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Show message if no user found
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2">Unable to load driver profile</h2>
          <p className="text-gray-600">Please try logging out and back in.</p>
          <Button onClick={() => window.location.href = '/login'} className="mt-4 bg-green text-white">
            Go to Login
          </Button>
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Vehicle Type Badge */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border">
            {user?.vehicle_type === 'car' ? (
              <>
                <Car className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">Car Driver</span>
              </>
            ) : (
              <>
                <Bike className="w-4 h-4 text-green" />
                <span className="text-xs font-medium text-gray-700">Bike Rider</span>
              </>
            )}
          </div>
          
          <Button onClick={fetchOrders} variant="outline" size="sm" disabled={refreshing} className="text-xs">
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs text-gray-500">Available</span>
            <Switch 
              checked={isAvailable} 
              onCheckedChange={(checked) => {
                if (hasActiveOrder && !checked) {
                  toast.error('Complete your current delivery before going offline');
                  return;
                }
                setIsAvailable(checked);
                toast.success(checked ? 'You are now online' : 'You are now offline');
              }} 
            />
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
        {hasActiveOrder && (
          <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            {user?.vehicle_type === 'car' ? '🚗 Currently on delivery' : '🏍️ Currently on delivery'}
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

      {/* Earnings Summary Card */}
      {earningsSummary && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-green" />
                <h3 className="font-semibold text-gray-700">Available Balance</h3>
              </div>
              <p className="text-3xl font-bold text-green">
                R{formatCurrency(earningsSummary.available_balance)}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                <span>Pending: R{formatCurrency(earningsSummary.pending_balance)}</span>
                <span>Total Earned: R{formatCurrency(earningsSummary.total_earned)}</span>
                <span>Withdrawn: R{formatCurrency(earningsSummary.total_paid)}</span>
              </div>
            </div>
            <Button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-green text-white shrink-0"
              disabled={!earningsSummary.available_balance || earningsSummary.available_balance < 50}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      )}

      {/* Bank Details Card */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-sm">Bank Details</h3>
            </div>
            {bankDetails.bank_name ? (
              <div className="text-sm">
                <p>{bankDetails.bank_name}</p>
                <p className="text-xs text-gray-500">{bankDetails.account_number}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No bank details added</p>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const bankName = prompt('Enter Bank Name:', bankDetails.bank_name || '');
              const accountHolder = prompt('Enter Account Holder Name:', bankDetails.account_holder || '');
              const accountNumber = prompt('Enter Account Number:', bankDetails.account_number || '');
              const branchCode = prompt('Enter Branch Code (optional):', bankDetails.branch_code || '');
              
              if (bankName && accountHolder && accountNumber) {
                setBankDetails({
                  bank_name: bankName,
                  account_holder: accountHolder,
                  account_number: accountNumber,
                  branch_code: branchCode || '',
                });
                saveBankDetails();
              }
            }}
          >
            {bankDetails.bank_name ? 'Update Bank Details' : 'Add Bank Details'}
          </Button>
        </div>
      </div>

      {/* Withdrawal History */}
      {withdrawalHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm sm:text-base font-bold mb-3">Withdrawal History</h2>
          <div className="space-y-2">
            {withdrawalHistory.map((payout) => {
              const amount = typeof payout.amount === 'number' ? payout.amount : parseFloat(payout.amount);
              const safeAmount = !isNaN(amount) ? amount : 0;
              const requestedDate = payout.requested_at || payout.created_at;
              
              return (
                <Card key={payout.id}>
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-green">R{safeAmount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">
                        {requestedDate ? new Date(requestedDate).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {payout.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                      {payout.reference_number && (
                        <p className="text-xs text-gray-400 mt-1">Ref: {payout.reference_number}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Summary Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green" />
            <div>
              <p className="text-xs text-gray-500">This Week's Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-green">R{formatCurrency(weeklyEarnings)}</p>
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
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {order.restaurant_name || (order.delivery_type === 'food' ? 'Restaurant' : 'Delivery')}
                        </p>
                        {order.delivery_type && order.delivery_type !== 'food' && (
                          <Badge className={
                            order.delivery_type === 'package' ? 'bg-purple-100 text-purple-800' :
                            order.delivery_type === 'document' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }>
                            {order.delivery_type === 'package' && '📦 Package'}
                            {order.delivery_type === 'document' && '📄 Document'}
                            {order.delivery_type === 'other' && '🚚 Other'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Order #{order.id}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Status: <span className="font-medium">{formatOrderStatus(order.status)}</span>
                      </p>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-green shrink-0 ml-2">
                      R{Number(order.total).toFixed(2)}
                    </span>
                  </div>

                  {order.customer_name && (
                    <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2 border border-green-100">
                      <User className="w-4 h-4 text-green" />
                      <span className="text-sm font-medium text-gray-700">
                        Customer: {order.customer_name}
                      </span>
                    </div>
                  )}

                  {order.customer_phone ? (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-500" />
                        <a href={`tel:${order.customer_phone}`} className="text-xs text-blue-600 hover:underline">
                          Call Customer
                        </a>
                      </div>
                      <div className="w-px h-4 bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-green-600" />
                        <a href={`https://wa.me/${formatWhatsAppNumber(order.customer_phone)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    order.customer_name && (
                      <div className="bg-yellow-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-yellow-600">⚠️ No phone number available</p>
                      </div>
                    )
                  )}

                  {/* Pickup Address for Package Deliveries */}
                  {order.delivery_type !== 'food' && order.pickup_address && (
                    <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                      <MapPin className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700">Pickup Location:</p>
                        <p className="text-xs text-gray-600">{order.pickup_address}</p>
                      </div>
                    </div>
                  )}

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

                  <Button
                    className="w-full bg-green hover:bg-green/90 text-white text-sm h-9 sm:h-10"
                    onClick={() => handleOrderAction(order)}
                  >
                    {getButtonText(order)}
                  </Button>

                  {order.delivery_type === 'food' && order.items && order.items.length > 0 && (
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
        
        {!isAvailable ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">You are currently offline</p>
              <p className="text-xs text-gray-400 mt-1">Toggle the switch above to go online</p>
            </CardContent>
          </Card>
        ) : availableOrders.length === 0 ? (
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
              const requiredVehicle = order.required_vehicle_type || 'bike';
              
              return (
                <Card key={order.id} className="hover:shadow-md transition">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base truncate">{order.restaurant_name || 'Delivery'}</p>
                          {requiredVehicle === 'car' && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                              <Car className="w-2.5 h-2.5 mr-1" />
                              Car Required
                            </Badge>
                          )}
                          {requiredVehicle === 'bike' && (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                              <Bike className="w-2.5 h-2.5 mr-1" />
                              Any Vehicle
                            </Badge>
                          )}
                          {order.delivery_type && order.delivery_type !== 'food' && (
                            <Badge className={
                              order.delivery_type === 'package' ? 'bg-purple-100 text-purple-800' :
                              order.delivery_type === 'document' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }>
                              {order.delivery_type === 'package' && '📦 Package'}
                              {order.delivery_type === 'document' && '📄 Document'}
                              {order.delivery_type === 'other' && '🚚 Other'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Order #{order.id} • {order.customer_name || 'Customer'} • {getItemCountText(order)}
                        </p>
                        <div className="flex items-start gap-1 mt-2">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-500 truncate">{formatAddress(order.delivery_address)}</p>
                        </div>
                        
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
                            disabled={hasActiveOrder || (requiredVehicle === 'car' && user?.vehicle_type === 'bike')}
                            className={`bg-green hover:bg-green/90 text-white text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 ${
                              requiredVehicle === 'car' && user?.vehicle_type === 'bike' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={requiredVehicle === 'car' && user?.vehicle_type === 'bike' ? 'This order requires a car' : ''}
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
                        <p className="font-semibold text-sm truncate">{order.restaurant_name || 'Delivery'}</p>
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

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green">
                R{formatCurrency(earningsSummary?.available_balance)}
              </p>
            </div>
            
            <div>
              <Label>Amount (R) *</Label>
              <Input
                type="number"
                placeholder="Minimum R50"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: R50</p>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Bank Details for Payout</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Bank:</span> {bankDetails.bank_name || 'Not set'}</p>
                <p><span className="font-medium">Account Holder:</span> {bankDetails.account_holder || 'Not set'}</p>
                <p><span className="font-medium">Account Number:</span> {bankDetails.account_number || 'Not set'}</p>
              </div>
              {(!bankDetails.bank_name || !bankDetails.account_number) && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ Please add your bank details in the section above before requesting withdrawal.
                </p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleWithdrawRequest} 
                disabled={loadingWithdraw || !bankDetails.bank_name || !bankDetails.account_number}
                className="flex-1 bg-green text-white"
              >
                {loadingWithdraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Request Withdrawal
              </Button>
              <Button onClick={() => setShowWithdrawModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Offer Modal */}
      <Dialog open={showPackageOfferModal} onOpenChange={setShowPackageOfferModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              New Package Delivery
            </DialogTitle>
          </DialogHeader>
          {packageOffer && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm font-semibold text-purple-800">Earnings: R{packageOffer.estimatedPay?.toFixed(2)}</p>
                {packageOffer.distance && (
                  <p className="text-xs text-purple-600">📍 {packageOffer.distance.toFixed(1)} km away</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accept within: {new Date(packageOffer.deadline).toLocaleTimeString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Pickup Location</p>
                    <p className="text-sm font-medium">{packageOffer.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Delivery Location</p>
                    <p className="text-sm font-medium">{packageOffer.deliveryAddress}</p>
                  </div>
                </div>
                {packageOffer.packageWeight && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Weight:</span>
                    <span className="text-sm">{packageOffer.packageWeight}kg</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => acceptPackageOffer(packageOffer.orderId)}
                  disabled={acceptingPackage}
                  className="flex-1 bg-green text-white"
                >
                  {acceptingPackage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Accept Delivery
                </Button>
                <Button 
                  onClick={() => setShowPackageOfferModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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