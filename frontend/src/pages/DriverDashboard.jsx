import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Package,
  CheckCircle2,
  CheckCircle,
  Clock,
  Loader2,
  History,
  DollarSign,
  Navigation,
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
  KeyRound,
  PenTool,
  Wifi,
  WifiOff,
  ChevronRight,
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
import SignaturePad from '@/components/SignaturePad';

const API_URL = import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com/api';

// STATUS FLOW - Food orders (Driver only sees ready_for_pickup and beyond)
const FOOD_STATUS_FLOW = {
  ready_for_pickup: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

// STATUS FLOW - Package deliveries
const PACKAGE_STATUS_FLOW = {
  pending_driver: 'assigned',
  assigned: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

// STATUS LABELS - Food orders
const FOOD_STATUS_LABELS = {
  ready_for_pickup: 'Accept & Pick Up',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

// STATUS LABELS - Package deliveries
const PACKAGE_STATUS_LABELS = {
  pending_driver: 'Accept Package',
  assigned: 'Pick Up Package',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ── DISTANCE MATRIX — via backend proxy (CORS-safe) ──
async function getDistanceMatrix(originLat, originLng, destinationAddress) {
  if (!originLat || !originLng || !destinationAddress) return null;
  try {
    const url =
      `${API_URL}/orders/maps/distance-matrix?` +
      `originLat=${encodeURIComponent(originLat)}&` +
      `originLng=${encodeURIComponent(originLng)}&` +
      `destination=${encodeURIComponent(destinationAddress)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.success && data.result) return data.result;
    return null;
  } catch (err) {
    console.error('Distance Matrix proxy error:', err);
    return null;
  }
}

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

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '#';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '27' + cleaned.substring(1);
  if (!cleaned.startsWith('27')) cleaned = '27' + cleaned;
  return cleaned;
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    preparing: 'bg-violet-50 text-violet-700 border-violet-200',
    ready_for_pickup: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    picked_up: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    on_the_way: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    pending_driver: 'bg-blue-50 text-blue-700 border-blue-200',
    assigned: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
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
  const [etaCache, setEtaCache] = useState({});

  const [packageOffer, setPackageOffer] = useState(null);
  const [showPackageOfferModal, setShowPackageOfferModal] = useState(false);
  const [acceptingPackage, setAcceptingPackage] = useState(false);

  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingOrder, setVerifyingOrder] = useState(false);
  const [showPickupSignatureModal, setShowPickupSignatureModal] = useState(false);
  const [showDeliverySignatureModal, setShowDeliverySignatureModal] = useState(false);
  const [currentOrderForSignature, setCurrentOrderForSignature] = useState(null);

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

  const formatCurrency = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num) ? num.toFixed(2) : '0.00';
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    if (user && user.id) {
      fetchOrders();
      fetchEarningsData();
      fetchWithdrawalHistory();
      fetchBankDetails();
    } else {
      const timer = setTimeout(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && !user) setUser(JSON.parse(storedUser));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem('declined_orders');
    if (saved) {
      try { setDeclinedOrders(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('declined_orders', JSON.stringify(declinedOrders));
  }, [declinedOrders]);

  useEffect(() => {
    if (availableOrders.length > 0 && driverLocation.lat && driverLocation.lng) {
      const fetchDistances = async () => {
        const newDistances = {};
        const newEtas = {};
        for (const order of availableOrders) {
          const address = order.delivery_type !== 'food'
            ? order.pickup_address
            : order.restaurant_address || order.restaurant_name;
          if (address) {
            try {
              const result = await getDistanceMatrix(driverLocation.lat, driverLocation.lng, address);
              if (result) {
                newDistances[order.id] = result.distance;
                newEtas[order.id] = {
                  durationText: result.durationText,
                  durationMinutes: Math.round(result.duration),
                  distanceText: result.distanceText,
                };
              } else {
                const fallbackDist = calculateDistance(driverLocation.lat, driverLocation.lng, -29.65, 31.05);
                if (fallbackDist) {
                  newDistances[order.id] = fallbackDist;
                  newEtas[order.id] = {
                    durationText: `${Math.round(fallbackDist / 30 * 60)} mins`,
                    durationMinutes: Math.round(fallbackDist / 30 * 60),
                    distanceText: `${fallbackDist.toFixed(1)} km`,
                  };
                }
              }
            } catch (err) {
              console.error('Error fetching distance for order:', order.id, err);
            }
          }
        }
        setRestaurantDistances(newDistances);
        setEtaCache(newEtas);
      };
      fetchDistances();
    }
  }, [availableOrders, driverLocation]);

  useEffect(() => {
    if (navigator.geolocation && isAvailable) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });
          if (socket && online) {
            const locationData = { lat: latitude, lng: longitude, timestamp: Date.now() };
            if (trackingOrder) {
              const orderData = { orderId: trackingOrder, ...locationData };
              socket.emit('driver-location', orderData);
              socket.emit('driver-location-update', orderData);
            } else {
              socket.emit('driver-location', locationData);
            }
          }
        },
        (error) => {
          if (error.code === 1) toast.error('Please enable location services to track deliveries');
        },
        { enableHighAccuracy: true, interval: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isAvailable, trackingOrder, socket, online]);

  useEffect(() => {
    if (socket && user?.id && online) {
      socket.emit('join-driver', user.id);

      socket.on('order-ready', (data) => {
        if (declinedOrders.includes(data.orderId)) return;
        toast.info(`🍔 Order #${data.orderId} is ready for pickup!`);
        fetchOrders();
      });

      socket.on('order-offered', (data) => {
        if (declinedOrders.includes(data.orderId)) return;
        if (data.requiredVehicle === 'car' && user?.vehicle_type === 'bike') return;
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

      socket.on('new-package-offer', (data) => {
        setPackageOffer(data);
        setShowPackageOfferModal(true);
        toast.info(`📦 Package Delivery! - R${data.estimatedPay?.toFixed(2)}`, {
          duration: 30000,
          action: { label: "Accept", onClick: () => acceptPackageOrder(data.orderId) }
        });
      });

      socket.on('package-offer-taken', (data) => {
        toast.info(`Package #${data.orderId} has been taken by another driver`);
        if (packageOffer?.orderId === data.orderId) setShowPackageOfferModal(false);
      });

      socket.on('earnings-updated', (data) => {
        toast.success(`💰 You earned R${formatCurrency(data.earning)} for order #${data.orderId}`);
        fetchOrders();
        fetchUserData();
        fetchEarningsData();
      });

      socket.on('request-driver-location', (data) => {
        if (trackingOrder && trackingOrder === data.orderId && driverLocation.lat && driverLocation.lng) {
          const locationData = {
            orderId: trackingOrder, lat: driverLocation.lat, lng: driverLocation.lng, timestamp: Date.now()
          };
          socket.emit('driver-location-update', locationData);
          socket.emit('driver-location', locationData);
        }
      });

      return () => {
        socket.off('order-ready');
        socket.off('order-offered');
        socket.off('new-package-offer');
        socket.off('package-offer-taken');
        socket.off('earnings-updated');
        socket.off('request-driver-location');
      };
    }
  }, [socket, user, online, declinedOrders, packageOffer, trackingOrder, driverLocation]);

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
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const res1 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/available?driver_id=${user.id}`);
      let available = await res1.json();
      if (!Array.isArray(available)) available = [];
      const filteredAvailable = available.filter(order => {
        if (declinedOrders.includes(order.id)) return false;
        if (order.delivery_type === 'food' && order.status !== 'ready_for_pickup') return false;
        if (order.delivery_type !== 'food' && order.status !== 'pending_driver') return false;
        return true;
      });
      setAvailableOrders(filteredAvailable);

      const res2 = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/${user.id}`);
      const mine = await res2.json();
      setMyOrders(Array.isArray(mine) ? mine : []);
      setDataLoaded(true);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setAvailableOrders([]);
      setMyOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, declinedOrders]);

  const acceptPackageOrder = async (orderId) => {
    setAcceptingPackage(true);
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/driver/accept-package/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success('Package accepted! Head to pickup location');
      setShowPackageOfferModal(false);
      setPackageOffer(null);
      fetchOrders();
      setIsAvailable(false);
    } catch (err) {
      toast.error(err.message || 'Failed to accept package');
    } finally {
      setAcceptingPackage(false);
    }
  };

  const acceptFoodOrder = async (orderId) => {
    if (hasActiveOrder) { toast.error('Complete your current delivery first'); return; }
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/accept/${orderId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: user.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message?.includes('requires a car')
          ? 'This order requires a car. Only car drivers can accept it.'
          : (data.message || 'Failed to accept order'));
        return;
      }
      toast.success('Order accepted! Pick up food from restaurant');
      fetchOrders();
      setTrackingOrder(orderId);
      setIsAvailable(false);
    } catch (err) {
      toast.error('Error accepting order');
    }
  };

  const verifyCollectionCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }
    setVerifyingOrder(true);
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/verify-code/${currentOrderForSignature.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ verification_code: verificationCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success('Code verified! Please collect signature');
      setShowCodeModal(false);
      setVerificationCode('');
      setShowPickupSignatureModal(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifyingOrder(false);
    }
  };

  const capturePickupSignature = async (signatureData) => {
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/pickup-signature/${currentOrderForSignature.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ signature_data: signatureData })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success('Package picked up successfully!');
      setShowPickupSignatureModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const captureDeliverySignature = async (signatureData) => {
    try {
      let gpsLocation = null;
      if (navigator.geolocation) {
        const position = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null));
        });
        if (position) gpsLocation = `${position.coords.latitude},${position.coords.longitude}`;
      }
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/delivery-signature/${currentOrderForSignature.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ signature_data: signatureData, gps_location: gpsLocation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success('Package delivered successfully!');
      setShowDeliverySignatureModal(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message);
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

  const updateStatus = async (orderId, currentStatus, isPackage) => {
    const statusFlow = isPackage ? PACKAGE_STATUS_FLOW : FOOD_STATUS_FLOW;
    const nextStatus = statusFlow[currentStatus];
    if (!nextStatus) { toast.error('Cannot update this order status'); return; }
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/status/${orderId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      const statusMessages = isPackage ? {
        picked_up: 'Package picked up! Starting delivery',
        on_the_way: 'Package en route to recipient!',
        delivered: 'Package delivered! Payment received',
      } : {
        picked_up: 'Food picked up from restaurant! Starting delivery',
        on_the_way: 'On the way to customer!',
        delivered: 'Order delivered! Payment received',
      };
      toast.success(statusMessages[nextStatus] || 'Status updated');
      if (nextStatus === 'on_the_way') setTrackingOrder(orderId);
      if (nextStatus === 'delivered') {
        setTrackingOrder(null);
        setIsAvailable(true);
        toast.success('You are now back online and can accept new deliveries');
        fetchEarningsData();
      }
      fetchOrders();
      if (nextStatus === 'delivered') await fetchUserData();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const getButtonText = (order) => {
    const isPackage = order.delivery_type && order.delivery_type !== 'food';
    return isPackage
      ? (PACKAGE_STATUS_LABELS[order.status] || 'Update Status')
      : (FOOD_STATUS_LABELS[order.status] || 'Update Status');
  };

  const handleOrderAction = (order) => {
    const isPackage = order.delivery_type && order.delivery_type !== 'food';
    if (isPackage) {
      if (order.status === 'pending_driver') acceptPackageOrder(order.id);
      else if (order.status === 'assigned') { setCurrentOrderForSignature(order); setShowCodeModal(true); }
      else if (order.status === 'picked_up') { setCurrentOrderForSignature(order); setShowDeliverySignatureModal(true); }
      else toast.error('Please use the verification buttons to update this delivery');
    } else {
      if (order.status === 'ready_for_pickup') acceptFoodOrder(order.id);
      else updateStatus(order.id, order.status, isPackage);
    }
  };

  const toggleExpand = (orderId) => setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));

  const formatAddress = (address) => {
    if (!address) return 'No address provided';
    if (address.length > 40) return address.substring(0, 40) + '...';
    return address;
  };

  const openGoogleMaps = (address) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const openGoogleMapsWithDirections = (fromAddress, toAddress) => {
    const encodedFrom = encodeURIComponent(fromAddress || '');
    const encodedTo = encodeURIComponent(toAddress || '');
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodedFrom}&destination=${encodedTo}&travelmode=driving`, '_blank');
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
      setWithdrawalHistory((data || []).map(item => ({
        ...item, amount: parseFloat(item.amount) || 0, requested_at: item.requested_at || item.created_at
      })));
    } catch (err) {
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
      if (data) setBankDetails(data);
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) { toast.error('Minimum withdrawal amount is R50'); return; }
    if (amount > (earningsSummary?.available_balance || 0)) {
      toast.error(`Insufficient balance. Available: R${formatCurrency(earningsSummary?.available_balance)}`);
      return;
    }
    if (!bankDetails.bank_name || !bankDetails.account_number) {
      toast.error('Please add your bank details first');
      return;
    }
    setLoadingWithdraw(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount, bank_name: bankDetails.bank_name, account_holder: bankDetails.account_holder,
          account_number: bankDetails.account_number, branch_code: bankDetails.branch_code
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

  const activeOrders = useMemo(
    () => myOrders.filter((o) => ['picked_up', 'on_the_way', 'assigned'].includes(o.status)),
    [myOrders]
  );
  const completedOrders = useMemo(() => myOrders.filter((o) => o.status === 'delivered'), [myOrders]);
  const totalEarnings = useMemo(
    () => completedOrders.reduce((sum, order) => sum + (Number(order.driver_earning) || 0), 0),
    [completedOrders]
  );
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
  const hasActiveOrder = useMemo(
    () => myOrders.some(order => ['picked_up', 'on_the_way', 'assigned'].includes(order.status)),
    [myOrders]
  );

  if (loading && !dataLoaded) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
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
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 bg-gray-50/40 min-h-screen">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 sm:mb-7">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Driver Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name || 'Driver'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
            {user?.vehicle_type === 'car' ? (
              <><Car className="w-4 h-4 text-blue-600" /><span className="text-xs font-semibold text-gray-700">Car Driver</span></>
            ) : (
              <><Bike className="w-4 h-4 text-green" /><span className="text-xs font-semibold text-gray-700">Bike Rider</span></>
            )}
          </div>
          <Button onClick={fetchOrders} variant="outline" size="sm" disabled={refreshing} className="text-xs rounded-xl">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-medium text-gray-500">Available</span>
            <Switch
              checked={isAvailable}
              onCheckedChange={(checked) => {
                if (hasActiveOrder && !checked) { toast.error('Complete your current delivery before going offline'); return; }
                setIsAvailable(checked);
                toast.success(checked ? 'You are now online' : 'You are now offline');
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Status strip ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className={cn(
          "inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border",
          online ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        )}>
          {online ? <Wifi className="w-3 h-3 mr-1.5" /> : <WifiOff className="w-3 h-3 mr-1.5" />}
          {online ? 'Live updates active' : 'Connecting...'}
        </span>
        {trackingOrder && (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <MapPin className="w-3 h-3 mr-1.5" /> Tracking order #{trackingOrder}
          </span>
        )}
        {hasActiveOrder && (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            {user?.vehicle_type === 'car' ? <Car className="w-3 h-3 mr-1.5" /> : <Bike className="w-3 h-3 mr-1.5" />}
            Currently on delivery
          </span>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <StatCard label="Active" value={activeOrders.length} icon={Package} color="bg-blue-500" />
        <StatCard label="Available" value={availableOrders.length} icon={Clock} color="bg-orange-500" />
        <StatCard label="Completed" value={completedOrders.length} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label="Earnings" value={`R${totalEarnings.toFixed(2)}`} icon={DollarSign} color="bg-violet-500" />
        <StatCard label="Rating" value={averageRating > 0 ? `${averageRating}★` : '—'} icon={Star} color="bg-amber-500" />
      </div>

      {/* ── Earnings Summary ── */}
      {earningsSummary && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-green/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-green" />
                </div>
                <h3 className="font-semibold text-gray-600 text-sm">Available Balance</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                R{formatCurrency(earningsSummary.available_balance)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                <span>Pending: R{formatCurrency(earningsSummary.pending_balance)}</span>
                <span>Total earned: R{formatCurrency(earningsSummary.total_earned)}</span>
                <span>Withdrawn: R{formatCurrency(earningsSummary.total_paid)}</span>
              </div>
            </div>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-green text-white shrink-0 rounded-xl shadow-sm"
              disabled={!earningsSummary.available_balance || earningsSummary.available_balance < 50}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      )}

      {/* ── Bank Details ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-sm text-gray-700">Bank Details</h3>
            </div>
            {bankDetails.bank_name ? (
              <div className="text-sm text-gray-600">
                <p className="font-medium">{bankDetails.bank_name}</p>
                <p className="text-xs text-gray-400">{bankDetails.account_number}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No bank details added</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={async () => {
              const bankName = prompt('Enter Bank Name:', bankDetails.bank_name || '');
              const accountHolder = prompt('Enter Account Holder Name:', bankDetails.account_holder || '');
              const accountNumber = prompt('Enter Account Number:', bankDetails.account_number || '');
              const branchCode = prompt('Enter Branch Code (optional):', bankDetails.branch_code || '');
              if (bankName && accountHolder && accountNumber) {
                const newDetails = {
                  bank_name: bankName, account_holder: accountHolder,
                  account_number: accountNumber, branch_code: branchCode || '',
                };
                setBankDetails(newDetails);
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('https://lloyds-delivery.onrender.com/api/driver/bank-details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(newDetails)
                  });
                  if (!res.ok) throw new Error('Failed to save bank details');
                  toast.success('Bank details saved successfully');
                } catch (err) {
                  toast.error('Failed to save bank details');
                }
              }
            }}
          >
            {bankDetails.bank_name ? 'Update' : 'Add Bank Details'}
          </Button>
        </div>
      </div>

      {/* ── Withdrawal History ── */}
      {withdrawalHistory.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Withdrawal History</h2>
          <div className="space-y-2">
            {withdrawalHistory.map((payout) => {
              const amount = typeof payout.amount === 'number' ? payout.amount : parseFloat(payout.amount);
              const safeAmount = !isNaN(amount) ? amount : 0;
              const requestedDate = payout.requested_at || payout.created_at;
              return (
                <Card key={payout.id} className="rounded-xl border-gray-100 shadow-sm">
                  <CardContent className="p-3.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">R{safeAmount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">
                        {requestedDate ? new Date(requestedDate).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={cn(
                        "border font-medium",
                        payout.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        payout.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      )}>
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

      {/* ── Weekly Summary ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-green" />
            </div>
            <div>
              <p className="text-xs text-gray-400">This Week's Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">R{formatCurrency(weeklyEarnings)}</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-400">Success Rate</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {myOrders.length > 0 ? `${Math.round((completedOrders.length / myOrders.length) * 100)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Deliveries ── */}
      {activeOrders.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Deliveries ({activeOrders.length})</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const isPackage = order.delivery_type && order.delivery_type !== 'food';
              const pickupLocation = isPackage ? order.pickup_address : (order.restaurant_address || order.restaurant_name);
              const orderEta = etaCache[order.id];

              return (
                <Card key={order.id} className="overflow-hidden rounded-2xl border-gray-100 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base truncate text-gray-900">
                            {isPackage ? '📦 Package Delivery' : (order.restaurant_name || 'Restaurant')}
                          </p>
                          <Badge className={cn("border font-medium text-[10px]", getStatusColor(order.status))}>
                            {formatOrderStatus(order.status)}
                          </Badge>
                          {isPackage && (
                            <Badge className={cn(
                              "border font-medium text-[10px]",
                              order.delivery_type === 'package' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                              order.delivery_type === 'document' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-orange-50 text-orange-700 border-orange-200'
                            )}>
                              {order.delivery_type === 'package' && '📦 Package'}
                              {order.delivery_type === 'document' && '📄 Document'}
                              {order.delivery_type === 'other' && '🚚 Other'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Order #{order.id}</p>
                      </div>
                      <span className="text-lg font-bold text-green shrink-0 ml-2">R{Number(order.total).toFixed(2)}</span>
                    </div>

                    {orderEta && (
                      <div className="bg-blue-50/70 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">ETA: {orderEta.durationText}</span>
                          <span className="text-xs text-blue-500">({orderEta.distanceText})</span>
                        </div>
                      </div>
                    )}

                    {order.customer_name && (
                      <div className={cn(
                        "flex items-center gap-2 rounded-xl p-2.5 border",
                        isPackage ? 'bg-violet-50/60 border-violet-100' : 'bg-green-50/60 border-green-100'
                      )}>
                        <User className={cn("w-4 h-4", isPackage ? 'text-violet-600' : 'text-green')} />
                        <span className="text-sm font-medium text-gray-700">
                          {isPackage ? 'Sender: ' : 'Customer: '}{order.customer_name}
                        </span>
                      </div>
                    )}

                    {isPackage && order.recipient_name && (
                      <div className="flex items-center gap-2 bg-blue-50/60 rounded-xl p-2.5 border border-blue-100">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Recipient: {order.recipient_name}</span>
                        {order.recipient_phone && (
                          <a href={`tel:${order.recipient_phone}`} className="text-xs text-blue-600 hover:underline ml-auto font-medium">Call</a>
                        )}
                      </div>
                    )}

                    {order.customer_phone ? (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                        <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                          <Phone className="w-3 h-3" /> Call {isPackage ? 'Sender' : 'Customer'}
                        </a>
                        <div className="w-px h-4 bg-gray-300" />
                        <a href={`https://wa.me/${formatWhatsAppNumber(order.customer_phone)}`} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    ) : (
                      order.customer_name && (
                        <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-amber-700">⚠️ No phone number available</p>
                        </div>
                      )
                    )}

                    {pickupLocation && (
                      <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5">
                        <MapPin className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", isPackage ? 'text-violet-500' : 'text-orange-500')} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">{isPackage ? 'Pickup Location' : 'Restaurant'}</p>
                          <p className="text-xs text-gray-500">{pickupLocation}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 rounded-lg" onClick={() => openGoogleMaps(pickupLocation)}>
                          <NavigateIcon className="w-3 h-3 mr-1" /> Navigate
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Delivery Location</p>
                          <p className="text-xs text-gray-500 truncate">{order.delivery_address}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 rounded-lg" onClick={() => openGoogleMaps(order.delivery_address)}>
                        <NavigateIcon className="w-3 h-3 mr-1" /> Navigate
                      </Button>
                    </div>

                    {pickupLocation && order.delivery_address && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-green/30 text-green hover:bg-green/5 text-xs rounded-xl"
                        onClick={() => openGoogleMapsWithDirections(pickupLocation, order.delivery_address)}
                      >
                        <NavigateIcon className="w-3 h-3 mr-2" /> Get Directions (Pickup → Delivery)
                      </Button>
                    )}

                    {isPackage && (
                      <div className="bg-violet-50/60 rounded-xl p-2.5">
                        <p className="text-xs font-semibold text-violet-700 mb-1.5">Package Details</p>
                        <div className="flex flex-wrap gap-2.5 text-xs text-gray-600">
                          {order.package_weight && <span>⚖️ {order.package_weight}kg</span>}
                          {order.package_dimensions && <span>📏 {order.package_dimensions}</span>}
                          {order.requires_signature && <span className="text-blue-600">📝 Signature Required</span>}
                          {order.is_fragile && <span className="text-orange-600">⚠️ Fragile</span>}
                          {order.package_description && <span className="text-gray-500 w-full">📝 {order.package_description}</span>}
                        </div>
                      </div>
                    )}

                    {isPackage && order.status === 'assigned' && (
                      <Button onClick={() => { setCurrentOrderForSignature(order); setShowCodeModal(true); }}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
                        <KeyRound className="w-4 h-4 mr-2" /> Verify Collection Code
                      </Button>
                    )}

                    {isPackage && order.status === 'picked_up' && (
                      <Button onClick={() => { setCurrentOrderForSignature(order); setShowDeliverySignatureModal(true); }}
                        className="w-full bg-violet-600 text-white hover:bg-violet-700 rounded-xl">
                        <PenTool className="w-4 h-4 mr-2" /> Get Delivery Signature
                      </Button>
                    )}

                    {!isPackage && (
                      <Button className="w-full bg-green hover:bg-green/90 text-white text-sm h-10 rounded-xl" onClick={() => handleOrderAction(order)}>
                        {getButtonText(order)}
                      </Button>
                    )}

                    {!isPackage && order.items && order.items.length > 0 && (
                      <>
                        <button onClick={() => toggleExpand(order.id)}
                          className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-700 pt-1">
                          <span>{expandedOrders[order.id] ? 'Hide' : 'View'} order details</span>
                          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expandedOrders[order.id] && "rotate-90")} />
                        </button>
                        {expandedOrders[order.id] && (
                          <div className="space-y-1.5 pt-2 border-t border-gray-100">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600">
                                <span>{item.quantity}x {item.name}</span>
                                <span>R{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs pt-1.5 border-t border-gray-100 font-medium text-gray-700">
                              <span>Delivery fee</span>
                              <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Available Orders ── */}
      <div className="mb-6 sm:mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Available Orders ({availableOrders.length})</h2>
          {declinedOrders.length > 0 && (
            <button onClick={clearDeclinedOrders} className="text-xs text-red-500 hover:underline font-medium">
              Clear Declined ({declinedOrders.length})
            </button>
          )}
        </div>

        {!isAvailable ? (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">You are currently offline</p>
              <p className="text-xs text-gray-400 mt-1">Toggle the switch above to go online</p>
            </CardContent>
          </Card>
        ) : availableOrders.length === 0 ? (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No available orders</p>
              <p className="text-xs text-gray-400 mt-1">Check back later for delivery requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {availableOrders.map((order) => {
              const distance = restaurantDistances[order.id];
              const etaInfo = etaCache[order.id];
              const requiredVehicle = order.required_vehicle_type || 'bike';
              const isPackage = order.delivery_type && order.delivery_type !== 'food';

              return (
                <Card key={order.id} className="rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base truncate text-gray-900">
                            {isPackage ? '📦 Package Delivery' : (order.restaurant_name || 'Delivery')}
                          </p>
                          {requiredVehicle === 'car' && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"><Car className="w-2.5 h-2.5 mr-1" />Car Required</Badge>
                          )}
                          {requiredVehicle === 'bike' && !isPackage && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"><Bike className="w-2.5 h-2.5 mr-1" />Any Vehicle</Badge>
                          )}
                          {isPackage && (
                            <Badge className={cn(
                              "border text-[10px]",
                              order.delivery_type === 'package' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                              order.delivery_type === 'document' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-orange-50 text-orange-700 border-orange-200'
                            )}>
                              {order.delivery_type === 'package' && '📦 Package'}
                              {order.delivery_type === 'document' && '📄 Document'}
                              {order.delivery_type === 'other' && '🚚 Other'}
                            </Badge>
                          )}
                          {!isPackage && order.status === 'ready_for_pickup' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Ready</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Order #{order.id} • {order.customer_name || 'Customer'}</p>

                        {isPackage && order.pickup_address && (
                          <div className="flex items-start gap-1 mt-2">
                            <MapPin className="w-3 h-3 text-violet-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-500 truncate">Pickup: {formatAddress(order.pickup_address)}</p>
                          </div>
                        )}
                        <div className="flex items-start gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-500 truncate">{isPackage ? 'Delivery: ' : ''}{formatAddress(order.delivery_address)}</p>
                        </div>

                        {etaInfo && (
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-xs text-blue-600 font-medium">📍 {etaInfo.distanceText} away</span>
                            <span className="text-xs text-emerald-600 font-medium">⏱️ {etaInfo.durationText}</span>
                          </div>
                        )}
                        {!etaInfo && distance && (
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">📍 {distance.toFixed(1)} km away</span>
                          </div>
                        )}

                        <p className="text-xs text-green mt-2 font-semibold">Delivery Fee: R{Number(order.delivery_fee || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center gap-2">
                        <p className="font-bold text-green text-lg">R{Number(order.total).toFixed(2)}</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOrderAction(order)}
                            disabled={hasActiveOrder || (requiredVehicle === 'car' && user?.vehicle_type === 'bike')}
                            className={cn(
                              "text-white text-xs h-9 px-3.5 rounded-xl",
                              isPackage ? 'bg-violet-600 hover:bg-violet-700' : 'bg-green hover:bg-green/90',
                              requiredVehicle === 'car' && user?.vehicle_type === 'bike' && 'opacity-50 cursor-not-allowed'
                            )}
                            title={requiredVehicle === 'car' && user?.vehicle_type === 'bike' ? 'This order requires a car' : ''}
                          >
                            {isPackage ? 'Accept Package' : 'Accept & Pick Up'}
                          </Button>
                          <Button
                            onClick={() => declineOrder(order.id, isPackage ? 'Package' : (order.restaurant_name || 'Order'))}
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 text-xs h-9 px-3.5 rounded-xl"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Decline
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

      {/* ── Declined Orders ── */}
      {declinedOrders.length > 0 && (
        <div className="mb-6">
          <button onClick={() => setShowDeclined(!showDeclined)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mb-2 font-medium">
            <AlertCircle className="w-3 h-3" />
            {showDeclined ? 'Hide' : 'Show'} Declined Orders ({declinedOrders.length})
          </button>
          {showDeclined && (
            <Card className="bg-gray-50 border-gray-100 rounded-2xl">
              <CardContent className="p-3.5">
                <p className="text-xs text-gray-500 mb-2">Orders you've declined:</p>
                <div className="flex flex-wrap gap-2">
                  {declinedOrders.map(id => (
                    <span key={id} className="text-xs bg-gray-200 px-2.5 py-1 rounded-full font-medium">#{id}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Delivery History ── */}
      {completedOrders.length > 0 && (
        <div className="mb-6">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3 font-medium">
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : `Show Delivery History (${completedOrders.length})`}
          </button>
          {showHistory && (
            <div className="space-y-2">
              {completedOrders.map((order) => {
                const isPackage = order.delivery_type && order.delivery_type !== 'food';
                return (
                  <Card key={order.id} className="bg-gray-50 rounded-xl border-gray-100">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-gray-800">
                            {isPackage ? '📦 Package Delivery' : (order.restaurant_name || 'Delivery')}
                          </p>
                          <p className="text-xs text-gray-400">Order #{order.id}</p>
                          <p className="text-xs text-gray-400">Delivered {new Date(order.created_at).toLocaleDateString()}</p>
                          {order.driver_rating && <p className="text-xs text-amber-600 mt-1">Rating: {order.driver_rating}★</p>}
                          {isPackage && order.recipient_name && <p className="text-xs text-violet-600 mt-1">Recipient: {order.recipient_name}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-green text-sm">R{Number(order.total).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Earned: R{Number(order.driver_earning || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link to="/profile">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <User className="w-4 h-4" /> View Profile
          </Button>
        </Link>
      </div>

      {/* ── Verification Code Modal ── */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" /> Verify Collection Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-xl text-sm text-blue-800">
              <p>Ask the customer for the 6-digit verification code they received.</p>
            </div>
            <div>
              <Label>Enter Verification Code</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 text-center text-2xl font-mono tracking-widest rounded-xl"
                maxLength={6}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={verifyCollectionCode} disabled={verifyingOrder || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 text-white rounded-xl">
                {verifyingOrder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Verify Code
              </Button>
              <Button onClick={() => setShowCodeModal(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignaturePad isOpen={showPickupSignatureModal} onClose={() => setShowPickupSignatureModal(false)} onSave={capturePickupSignature} title="Pickup Signature" />
      <SignaturePad isOpen={showDeliverySignatureModal} onClose={() => setShowDeliverySignatureModal(false)} onSave={captureDeliverySignature} title="Delivery Signature - Recipient" />

      {/* ── Withdrawal Modal ── */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green">R{formatCurrency(earningsSummary?.available_balance)}</p>
            </div>
            <div>
              <Label>Amount (R) *</Label>
              <Input type="number" placeholder="Minimum R50" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1 rounded-xl" />
              <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: R50</p>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Bank Details for Payout</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Bank:</span> {bankDetails.bank_name || 'Not set'}</p>
                <p><span className="font-medium">Account Holder:</span> {bankDetails.account_holder || 'Not set'}</p>
                <p><span className="font-medium">Account Number:</span> {bankDetails.account_number || 'Not set'}</p>
              </div>
              {(!bankDetails.bank_name || !bankDetails.account_number) && (
                <p className="text-xs text-red-500 mt-2">⚠️ Please add your bank details in the section above before requesting withdrawal.</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleWithdrawRequest} disabled={loadingWithdraw || !bankDetails.bank_name || !bankDetails.account_number}
                className="flex-1 bg-green text-white rounded-xl">
                {loadingWithdraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Request Withdrawal
              </Button>
              <Button onClick={() => setShowWithdrawModal(false)} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Package Offer Modal ── */}
      <Dialog open={showPackageOfferModal} onOpenChange={setShowPackageOfferModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-500" /> New Package Delivery
            </DialogTitle>
          </DialogHeader>
          {packageOffer && (
            <div className="space-y-4">
              <div className="bg-violet-50 p-3 rounded-xl">
                <p className="text-sm font-semibold text-violet-800">Earnings: R{packageOffer.estimatedPay?.toFixed(2)}</p>
                {packageOffer.distance && <p className="text-xs text-violet-600">📍 {packageOffer.distance.toFixed(1)} km away</p>}
                <p className="text-xs text-gray-500 mt-1">Accept within: {new Date(packageOffer.deadline).toLocaleTimeString()}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green mt-0.5 shrink-0" />
                  <div><p className="text-xs text-gray-500">Pickup Location</p><p className="text-sm font-medium">{packageOffer.pickupAddress}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div><p className="text-xs text-gray-500">Delivery Location</p><p className="text-sm font-medium">{packageOffer.deliveryAddress}</p></div>
                </div>
                {packageOffer.packageWeight && (
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Weight:</span><span className="text-sm">{packageOffer.packageWeight}kg</span></div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => acceptPackageOrder(packageOffer.orderId)} disabled={acceptingPackage}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                  {acceptingPackage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Accept Delivery
                </Button>
                <Button onClick={() => setShowPackageOfferModal(false)} variant="outline" className="flex-1 rounded-xl">Decline</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="p-3 sm:p-3.5 flex items-center gap-2.5">
        <div className={cn("p-2 rounded-xl shrink-0", color)}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-400 truncate">{label}</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}