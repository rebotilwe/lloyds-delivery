import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Store, ShoppingBag, DollarSign, TrendingUp, Clock, AlertCircle, 
  Wallet, CreditCard, Banknote, Percent, History, RefreshCw, Loader2,
  Phone, Mail, MapPin, Star, ChevronRight, XCircle, CheckCircle2,
  Navigation, Globe, Truck, Building2, Users, Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ── GOOGLE MAPS DISTANCE MATRIX API ──────────────────────────────────────
async function getDistanceMatrix(originLat, originLng, destinationAddress) {
  if (!originLat || !originLng || !destinationAddress) return null;
  
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${originLat},${originLng}&` +
      `destinations=${encodeURIComponent(destinationAddress)}&` +
      `key=${GOOGLE_MAPS_API_KEY}&` +
      `region=za&` +
      `units=metric`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, // km
        distanceText: element.distance.text,
        duration: element.duration.value / 60, // minutes
        durationText: element.duration.text,
        durationInSeconds: element.duration.value,
      };
    }
    return null;
  } catch (err) {
    console.error('Distance Matrix API error:', err);
    return null;
  }
}

// ── HELPER: Calculate distance (Haversine - fallback) ──────────────────────
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

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    total_revenue: 0,
    weekly_orders: 0,
    weekly_revenue: 0
  });

  // Restaurant Location State
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantCoords, setRestaurantCoords] = useState({ lat: null, lng: null });
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(25);
  const [distanceBasedPricing, setDistanceBasedPricing] = useState(true);

  // EARNINGS & WITHDRAWAL STATES
  const [earningsSummary, setEarningsSummary] = useState({
    total_earned: 0,
    available_balance: 0,
    withdrawn_total: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
  });
  const [showBankModal, setShowBankModal] = useState(false);

  // Recent Orders
  const [recentOrders, setRecentOrders] = useState([]);

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num) ? num.toFixed(2) : '0.00';
  };

  useEffect(() => {
    checkRestaurant();
    fetchEarningsData();
    fetchWithdrawalHistory();
    fetchBankDetails();
    fetchRecentOrders();
  }, []);

  const checkRestaurant = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/restaurant');
      if (response.data && response.data.id) {
        setHasRestaurant(true);
        setRestaurant(response.data);
        setRestaurantAddress(response.data.address || '');
        setDeliveryRadius(response.data.delivery_radius || 10);
        setBaseDeliveryFee(response.data.base_delivery_fee || 25);
        setDistanceBasedPricing(response.data.distance_based_pricing !== false);
        if (response.data.latitude && response.data.longitude) {
          setRestaurantCoords({
            lat: parseFloat(response.data.latitude),
            lng: parseFloat(response.data.longitude)
          });
        }
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

  const fetchRecentOrders = async () => {
    try {
      const response = await api.get('/vendor/orders/recent');
      setRecentOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };

  const fetchEarningsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/earnings-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const summary = data.summary || {};
      
      setEarningsSummary({
        total_earned: parseFloat(summary.total_earned) || 0,
        available_balance: parseFloat(summary.available_balance) || 0,
        withdrawn_total: parseFloat(summary.withdrawn_total) || 0
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/withdrawal-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWithdrawalHistory(data || []);
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/bank-details', {
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
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bankDetails)
      });
      
      if (!res.ok) throw new Error('Failed to save bank details');
      
      toast.success('Bank details saved successfully');
      setShowBankModal(false);
    } catch (err) {
      toast.error('Failed to save bank details');
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal amount is R100');
      return;
    }
    
    if (amount > (earningsSummary?.available_balance || 0)) {
      toast.error(`Insufficient balance. Available: R${formatCurrency(earningsSummary?.available_balance)}`);
      return;
    }
    
    if (!bankDetails.bank_name || !bankDetails.account_number) {
      toast.error('Please add your bank details first');
      setShowBankModal(true);
      return;
    }
    
    setLoadingWithdraw(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/request-withdrawal', {
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

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchEarningsData(),
      fetchWithdrawalHistory(),
      fetchBankDetails(),
      fetchRecentOrders()
    ]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const goToOnboarding = () => {
    navigate('/vendor/onboarding');
  };

  const openGoogleMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
  };

  const handleAddressSelect = async (fullAddress, coords) => {
    setRestaurantAddress(fullAddress);
    if (coords) {
      setRestaurantCoords({ lat: coords.lat, lng: coords.lng });
      
      // Save location to restaurant settings
      try {
        const token = localStorage.getItem('token');
        await fetch('https://lloyds-delivery.onrender.com/api/vendor/restaurant/location', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            address: fullAddress,
            latitude: coords.lat,
            longitude: coords.lng
          })
        });
        toast.success('Restaurant location updated');
      } catch (err) {
        console.error('Error saving location:', err);
      }
    }
  };

  const updateDeliverySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://lloyds-delivery.onrender.com/api/vendor/restaurant/delivery-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          delivery_radius: deliveryRadius,
          base_delivery_fee: baseDeliveryFee,
          distance_based_pricing: distanceBasedPricing
        })
      });
      toast.success('Delivery settings updated');
    } catch (err) {
      toast.error('Failed to update delivery settings');
    }
  };

  const getOrderStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready_for_pickup: 'bg-green-100 text-green-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_the_way: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's your business overview</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => navigate('/vendor/settings')} 
            variant="outline" 
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Restaurant Info Card with Google Maps Integration */}
      {restaurant && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                  <Badge className="bg-green-100 text-green-800">
                    {restaurant.markup_percentage || 12.5}% Markup
                  </Badge>
                  {restaurant.is_active && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{restaurantAddress || restaurant.address}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={() => openGoogleMaps(restaurantAddress || restaurant.address)}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Map
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>📍 Delivery Radius: {deliveryRadius}km</span>
                    <span>🚚 Base Fee: R{baseDeliveryFee}</span>
                    <span>{distanceBasedPricing ? '📏 Distance-based pricing' : '💰 Fixed pricing'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('delivery-settings').scrollIntoView({ behavior: 'smooth' })}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Delivery Settings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/vendor/menu')}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Menu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Update with Google Places Autocomplete */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">Restaurant Address</Label>
              <AddressAutocomplete
                value={restaurantAddress}
                onChange={setRestaurantAddress}
                onSelect={handleAddressSelect}
                placeholder="Enter your restaurant address"
                className="w-full"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (restaurantCoords.lat && restaurantCoords.lng) {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${restaurantCoords.lat},${restaurantCoords.lng}`,
                    '_blank'
                  );
                }
              }}
              disabled={!restaurantCoords.lat}
            >
              <Globe className="w-4 h-4 mr-2" />
              View on Map
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card id="delivery-settings" className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Delivery Settings
              </h4>
              <p className="text-xs text-blue-600 mt-1">
                These settings affect how delivery fees are calculated for your customers
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Radius:</Label>
                <Input
                  type="number"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                  min="1"
                  max="50"
                />
                <span className="text-xs text-gray-500">km</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Base Fee:</Label>
                <Input
                  type="number"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                  min="0"
                />
                <span className="text-xs text-gray-500">R</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={distanceBasedPricing}
                    onChange={(e) => setDistanceBasedPricing(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Distance pricing
                </Label>
              </div>
              <Button onClick={updateDeliverySettings} variant="outline" size="sm">
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary Card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-700">Available Balance</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              R{formatCurrency(earningsSummary.available_balance)}
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              <span>Total Earned: R{formatCurrency(earningsSummary.total_earned)}</span>
              <span>Withdrawn: R{formatCurrency(earningsSummary.withdrawn_total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowBankModal(true)}
              variant="outline"
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bank Details
            </Button>
            <Button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-purple-600 text-white hover:bg-purple-700 shrink-0"
              disabled={!earningsSummary.available_balance || earningsSummary.available_balance < 100}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      </div>

      {/* Bank Details Card (if exists) */}
      {bankDetails.bank_name && (
        <div className="bg-white border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {bankDetails.bank_name} • {bankDetails.account_number}
            </span>
            <span className="text-xs text-gray-400">
              {bankDetails.account_holder}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowBankModal(true)}
          >
            Update
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-bold text-green">R{formatCurrency(stats.today_revenue)}</p>
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
                <p className="text-2xl font-bold text-purple-600">R{formatCurrency(stats.total_revenue)}</p>
                <p className="text-xs text-gray-400">All time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Recent Orders
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/vendor/orders')}
              className="text-xs"
            >
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order) => (
              <Card key={order.id}>
                <CardContent className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">#{order.id}</p>
                      <Badge className={getOrderStatusBadge(order.status)}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.customer_name || 'Customer'} • {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                    {order.delivery_address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{order.delivery_address}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1 text-xs text-blue-500"
                          onClick={() => openGoogleMaps(order.delivery_address)}
                        >
                          <Navigation className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green">R{formatCurrency(order.total)}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={() => navigate(`/vendor/orders/${order.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      {withdrawalHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Withdrawal History
          </h2>
          <div className="space-y-2">
            {withdrawalHistory.slice(0, 5).map((payout) => (
              <Card key={payout.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-purple-600">R{parseFloat(payout.amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {payout.status?.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button 
          onClick={() => navigate('/vendor/orders')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-xs">Orders</span>
          {stats.pending_orders > 0 && (
            <span className="text-xs text-yellow-600">{stats.pending_orders} pending</span>
          )}
        </Button>
        
        <Button 
          onClick={() => navigate('/vendor/menu')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <Store className="w-5 h-5" />
          <span className="text-xs">Menu</span>
          <span className="text-xs text-gray-400">Add/Edit items</span>
        </Button>

        <Button 
          onClick={() => navigate('/vendor/withdrawals')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <History className="w-5 h-5" />
          <span className="text-xs">Withdrawals</span>
          <span className="text-xs text-gray-400">View all payouts</span>
        </Button>

        <Button 
          onClick={() => navigate('/vendor/analytics')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-xs">Analytics</span>
          <span className="text-xs text-gray-400">View insights</span>
        </Button>
      </div>

      {/* Info Card about Markup */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Percent className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">How earnings work</p>
              <p className="text-xs text-blue-700 mt-1">
                Your menu prices shown to customers include a {restaurant?.markup_percentage || 12.5}% markup. 
                You receive 100% of your set vendor price. The markup covers delivery platform costs.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                📍 Delivery fees are calculated based on distance from your restaurant to the customer's address.
                {distanceBasedPricing ? ' Distance-based pricing is enabled.' : ' Fixed pricing is enabled.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-purple-600">
                R{formatCurrency(earningsSummary?.available_balance)}
              </p>
            </div>
            
            <div>
              <Label>Amount (R) *</Label>
              <Input
                type="number"
                placeholder="Minimum R100"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: R100</p>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Bank Details for Payout</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Bank:</span> {bankDetails.bank_name || 'Not set'}</p>
                <p><span className="font-medium">Account Holder:</span> {bankDetails.account_holder || 'Not set'}</p>
                <p><span className="font-medium">Account Number:</span> {bankDetails.account_number || 'Not set'}</p>
              </div>
              {(!bankDetails.bank_name || !bankDetails.account_number) && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ Please add your bank details before requesting withdrawal.
                </p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleWithdrawRequest} 
                disabled={loadingWithdraw || !bankDetails.bank_name || !bankDetails.account_number}
                className="flex-1 bg-purple-600 text-white"
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

      {/* Bank Details Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bank Name *</Label>
              <Input
                placeholder="e.g., Capitec, FNB, Standard Bank"
                value={bankDetails.bank_name || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Holder Name *</Label>
              <Input
                placeholder="Name on the account"
                value={bankDetails.account_holder || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, account_holder: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input
                placeholder="Account number"
                value={bankDetails.account_number || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Branch Code (Optional)</Label>
              <Input
                placeholder="Branch code"
                value={bankDetails.branch_code || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, branch_code: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveBankDetails} className="flex-1 bg-green text-white">
                Save Bank Details
              </Button>
              <Button onClick={() => setShowBankModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}