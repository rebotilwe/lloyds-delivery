import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Truck, DollarSign, Clock,
  Users, AlertCircle, TrendingUp, ArrowRight,
  CheckCircle, XCircle, Store, Package, MapPin, RefreshCw,
  Navigation, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import RevenueChart from '@/components/admin/RevenueChart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ── Tiny helpers ─────────────────────────────────────────────

const fmt = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLOR = {
  pending:    'bg-amber-100 text-amber-700',
  confirmed:  'bg-blue-100 text-blue-700',
  preparing:  'bg-indigo-100 text-indigo-700',
  on_the_way: 'bg-purple-100 text-purple-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-700',
};

const timeAgo = (ts) => {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Stat card ──
function StatCard({ label, value, sub, icon: Icon, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2 sm:gap-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
    >
      <div className={cn('flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-slate-400 truncate">
          {label}
        </p>
        <p className="text-base sm:text-xl font-bold text-slate-900 leading-tight truncate">
          {value}
        </p>
        {sub && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </button>
  );
}

// ── Alert row ──
function AlertRow({ label, count, color, path, navigate }) {
  if (!count) return null;
  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs sm:text-sm transition-colors hover:opacity-90',
        color
      )}
    >
      <span className="font-medium truncate">{count} {label}</span>
      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 opacity-60 shrink-0" />
    </button>
  );
}

// ── Recent order row ──
function OrderRow({ order }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-slate-800">#{order.id}</span>
          <span className={cn('rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap', STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600')}>
            {order.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="truncate text-[10px] sm:text-xs text-slate-400">{order.customer_name ?? 'Customer'} · {order.restaurant_name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs sm:text-sm font-bold text-slate-800">{fmt(order.total)}</p>
        <p className="text-[9px] sm:text-[10px] text-slate-400">{timeAgo(order.created_at)}</p>
      </div>
    </div>
  );
}

// ── Google Maps Map Component ──
function PackageMap({ pickupAddress, deliveryAddress, onClose }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(true);
      setMapLoading(false);
      return;
    }
    
    if (window.google?.maps) {
      setMapReady(true);
      setMapLoading(false);
      return;
    }

    // Reuse existing script tag if already injected by another component
    if (document.getElementById('google-maps-script')) {
      const poll = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(poll);
          setMapReady(true);
          setMapLoading(false);
        }
      }, 150);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapReady(true);
      setMapLoading(false);
    };
    script.onerror = () => {
      setLoadError(true);
      setMapLoading(false);
    };
    document.head.appendChild(script);

    // Deliberately NOT removing the script tag on unmount —
    // Google Maps is a global singleton shared across components.
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 13,
      center: { lat: -29.8587, lng: 31.0218 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#22c55e', strokeWeight: 4, strokeOpacity: 0.8 },
    });
    directionsRendererRef.current.setMap(mapRef.current);

    return () => {
      mapRef.current = null;
    };
  }, [mapReady]);

  // Geocode and add markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    let addressesGeocoded = 0;
    const totalAddresses = (pickupAddress ? 1 : 0) + (deliveryAddress ? 1 : 0);

    const checkAndFitBounds = () => {
      addressesGeocoded++;
      if (addressesGeocoded >= totalAddresses) {
        // Fit bounds to show all markers
        const zoom = mapRef.current.getZoom();
        mapRef.current.fitBounds(bounds, { padding: 80 });
        // If only one marker, set zoom to 15
        if (totalAddresses === 1) {
          mapRef.current.setZoom(15);
        }
      }
    };

    // Add pickup marker
    if (pickupAddress) {
      geocoder.geocode({ address: pickupAddress }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const pos = results[0].geometry.location;
          pickupMarkerRef.current = new window.google.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: 'Pickup Location',
            label: { text: 'P', color: 'white', fontWeight: 'bold', fontSize: '12px' },
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#22c55e" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="white">P</text></svg>'
              ),
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 18),
            },
          });
          bounds.extend(pos);
          checkAndFitBounds();
        } else {
          checkAndFitBounds();
        }
      });
    }

    // Add delivery marker
    if (deliveryAddress) {
      geocoder.geocode({ address: deliveryAddress }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const pos = results[0].geometry.location;
          deliveryMarkerRef.current = new window.google.maps.Marker({
            position: pos,
            map: mapRef.current,
            title: 'Delivery Location',
            label: { text: 'D', color: 'white', fontWeight: 'bold', fontSize: '12px' },
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#dc2626" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="white">D</text></svg>'
              ),
              scaledSize: new window.google.maps.Size(36, 36),
              anchor: new window.google.maps.Point(18, 18),
            },
          });
          bounds.extend(pos);
          checkAndFitBounds();
        } else {
          checkAndFitBounds();
        }
      });
    }

    // Draw route between pickup and delivery
    if (pickupAddress && deliveryAddress) {
      geocoder.geocode({ address: pickupAddress }, (pickupResults, pickupStatus) => {
        if (pickupStatus === 'OK' && pickupResults[0]) {
          const origin = pickupResults[0].geometry.location;
          geocoder.geocode({ address: deliveryAddress }, (deliveryResults, deliveryStatus) => {
            if (deliveryStatus === 'OK' && deliveryResults[0]) {
              const destination = deliveryResults[0].geometry.location;
              const directionsService = new window.google.maps.DirectionsService();
              directionsService.route(
                { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
                (result, routeStatus) => {
                  if (routeStatus === 'OK' && directionsRendererRef.current) {
                    directionsRendererRef.current.setDirections(result);
                  }
                }
              );
            }
          });
        }
      });
    }
  }, [pickupAddress, deliveryAddress, mapReady]);

  if (mapLoading) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
        <span className="ml-2 text-gray-500 text-sm">Loading map...</span>
      </div>
    );
  }

  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 text-sm mb-3">Map is unavailable</p>
        <div className="flex gap-2">
          {pickupAddress && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(pickupAddress)}`, '_blank')}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Pickup
            </Button>
          )}
          {deliveryAddress && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(deliveryAddress)}`, '_blank')}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Delivery
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="w-full h-64 rounded-lg overflow-hidden border" />
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <span className="text-[9px] text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
          Powered by Google Maps
        </span>
      </div>
    </div>
  );
}

// ── Main dashboard ──
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // States for package approvals
  const [pendingPackages, setPendingPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const r = await api.get('/orders');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
    refetchInterval: 15000,
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });

  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const r = await api.get('/restaurants');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });

  // Fetch pending packages
  const fetchPendingPackages = async () => {
    setLoadingPackages(true);
    try {
      const response = await api.get('/orders/admin/pending-packages');
      setPendingPackages(response.data || []);
    } catch (error) {
      console.error('Error fetching pending packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchPendingPackages();
  }, []);

  // Derived stats
  const drivers       = useMemo(() => users.filter(u => u.role === 'driver'), [users]);
  const vendors       = useMemo(() => users.filter(u => u.role === 'vendor'), [users]);
  const activeDrivers = useMemo(() => drivers.filter(d => d.driver_status === 'approved'), [drivers]);
  const pendingDrivers= useMemo(() => drivers.filter(d => d.driver_status === 'pending'), [drivers]);
  const pendingVendors= useMemo(() => vendors.filter(v => !v.vendor_status || v.vendor_status === 'pending'), [vendors]);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending' && o.delivery_type === 'food'), [orders]);
  const totalRevenue  = useMemo(() => orders.reduce((s, o) => s + Number(o.total || 0), 0), [orders]);
  const todayRevenue  = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(o => o.created_at && new Date(o.created_at).toDateString() === today)
      .reduce((s, o) => s + Number(o.total || 0), 0);
  }, [orders]);
  const recentOrders  = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6), [orders]);
  const completedPct  = orders.length ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100) : 0;
  const hasAlerts     = pendingDrivers.length + pendingVendors.length + pendingOrders.length > 0;

  const firstName = user?.full_name?.split(' ')[0] || user?.name || 'Admin';

  // Approve package
  const approvePackage = async (orderId) => {
    setApproving(true);
    try {
      await api.put(`/orders/admin/approve-package/${orderId}`, { action: 'approve' });
      toast.success('Package approved and sent to drivers');
      fetchPendingPackages();
      refetchOrders();
      setShowPackageModal(false);
    } catch (error) {
      console.error('Error approving package:', error);
      toast.error('Failed to approve package');
    } finally {
      setApproving(false);
    }
  };

  // Reject package
  const rejectPackage = async (orderId) => {
    if (!rejectionReason) {
      const reason = prompt('Enter rejection reason:');
      if (!reason) return;
      setRejectionReason(reason);
    }
    
    setApproving(true);
    try {
      await api.put(`/orders/admin/approve-package/${orderId}`, { 
        action: 'reject', 
        rejection_reason: rejectionReason || 'Not specified'
      });
      toast.success('Package rejected');
      fetchPendingPackages();
      refetchOrders();
      setShowPackageModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting package:', error);
      toast.error('Failed to reject package');
    } finally {
      setApproving(false);
    }
  };

  const isLoading = ordersLoading || usersLoading || restaurantsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Greeting */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900">Good {greeting()}, {firstName} 👋</h2>
        <p className="text-xs sm:text-sm text-slate-400">Here's what's happening today.</p>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400">Action needed</p>
          <div className="space-y-1.5">
            <AlertRow label="orders waiting for assignment" count={pendingOrders.length}
              color="border-amber-200 bg-amber-50 text-amber-800"
              path="/admin/orders" navigate={navigate} />
            <AlertRow label="drivers pending approval" count={pendingDrivers.length}
              color="border-blue-200 bg-blue-50 text-blue-800"
              path="/admin/drivers" navigate={navigate} />
            <AlertRow label="vendors pending approval" count={pendingVendors.length}
              color="border-purple-200 bg-purple-50 text-purple-800"
              path="/admin/vendors" navigate={navigate} />
          </div>
        </div>
      )}

      {/* Stat cards — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Revenue" value={fmt(totalRevenue)}
          sub={`Today: ${fmt(todayRevenue)}`}
          icon={DollarSign} iconBg="bg-emerald-500"
          onClick={() => navigate('/admin/finance')}
        />
        <StatCard
          label="Orders" value={orders.length}
          sub={`${completedPct}% completed`}
          icon={ShoppingBag} iconBg="bg-blue-500"
          onClick={() => navigate('/admin/orders')}
        />
        <StatCard
          label="Active Drivers" value={activeDrivers.length}
          sub={`${drivers.length} total`}
          icon={Truck} iconBg="bg-violet-500"
          onClick={() => navigate('/admin/drivers')}
        />
        <StatCard
          label="Restaurants" value={restaurants.length}
          sub={`${vendors.length} vendors`}
          icon={Store} iconBg="bg-orange-500"
          onClick={() => navigate('/admin/restaurants')}
        />
      </div>

      {/* Revenue chart + recent orders side by side on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Chart — takes 3/5 */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="mb-3 text-xs sm:text-sm font-semibold text-slate-700">Revenue (last 7 days)</p>
          <RevenueChart orders={orders} compact />
        </div>

        {/* Recent orders — takes 2/5 */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-slate-700">Recent Orders</p>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-[10px] sm:text-xs font-medium text-blue-500 hover:text-blue-600"
            >
              View all
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <ShoppingBag className="mb-2 h-6 w-6 sm:h-8 sm:w-8" />
              <p className="text-[10px] sm:text-xs">No orders yet</p>
            </div>
          ) : (
            recentOrders.map(o => <OrderRow key={o.id} order={o} />)
          )}
        </div>

      </div>

      {/* Pending Package Deliveries Section */}
      {pendingPackages.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              Package Delivery Requests ({pendingPackages.length})
            </h2>
            <Button onClick={fetchPendingPackages} variant="outline" size="sm" disabled={loadingPackages}>
              <RefreshCw className={`w-3 h-3 mr-1 ${loadingPackages ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="space-y-3">
            {pendingPackages.map((pkg) => (
              <Card key={pkg.id} className="border-yellow-200 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedPackage(pkg); setShowPackageModal(true); }}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          {pkg.delivery_type === 'package' && '📦 Package'}
                          {pkg.delivery_type === 'document' && '📄 Document'}
                          {pkg.delivery_type === 'other' && '🚚 Other'}
                        </Badge>
                        <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Pickup Address</p>
                          <p className="font-medium flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-green mt-0.5 shrink-0" />
                            {pkg.pickup_address || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivery Address</p>
                          <p className="font-medium flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                            {pkg.delivery_address}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Recipient</p>
                          <p>{pkg.recipient_name || 'N/A'} {pkg.recipient_phone && `(${pkg.recipient_phone})`}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Package Details</p>
                          <p>
                            {pkg.package_weight && `⚖️ ${pkg.package_weight}kg `}
                            {pkg.package_dimensions && `📏 ${pkg.package_dimensions} `}
                            {pkg.requires_signature && <span className="text-blue-600">📝 Signature</span>}
                            {pkg.is_fragile && <span className="text-orange-600 ml-1">⚠️ Fragile</span>}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Customer: {pkg.customer_name} • {pkg.customer_email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green">R{parseFloat(pkg.total).toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); approvePackage(pkg.id); }}
                          className="bg-green text-white"
                          disabled={approving}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={(e) => { e.stopPropagation(); 
                            const reason = prompt('Enter rejection reason:');
                            if (reason) {
                              setRejectionReason(reason);
                              rejectPackage(pkg.id);
                            }
                          }}
                          disabled={approving}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          onClick={(e) => { e.stopPropagation(); setSelectedPackage(pkg); setShowPackageModal(true); }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="mb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400">Quick access</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Users',  icon: Users,       path: '/admin/users',    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
            { label: 'Disputes',   icon: AlertCircle, path: '/admin/disputes', bg: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Driver Payouts',    icon: TrendingUp,  path: '/admin/driver-payouts',  bg: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Vendor Payouts',    icon: Store,  path: '/admin/vendor-payouts',  bg: 'bg-purple-50 text-purple-700 border-purple-200' },
          ].map(({ label, icon: Icon, path, bg }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn('flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm font-medium transition-colors hover:opacity-80 whitespace-nowrap', bg)}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Package Details Modal with Map */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Package Delivery Details
            </DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              {/* Google Maps Integration */}
              {(selectedPackage.pickup_address || selectedPackage.delivery_address) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm mb-2">📍 Route Map</p>
                  <PackageMap 
                    pickupAddress={selectedPackage.pickup_address}
                    deliveryAddress={selectedPackage.delivery_address}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold">Customer Information</p>
                  <p className="text-sm">{selectedPackage.customer_name}</p>
                  <p className="text-xs text-gray-500">{selectedPackage.customer_email}</p>
                  {selectedPackage.customer_phone && (
                    <p className="text-xs text-gray-500">📞 {selectedPackage.customer_phone}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold">Recipient Details</p>
                  <p className="text-sm">Name: {selectedPackage.recipient_name || 'N/A'}</p>
                  <p className="text-sm">Phone: {selectedPackage.recipient_phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold">Pickup Address</p>
                  <p className="text-sm">{selectedPackage.pickup_address || 'Not specified'}</p>
                  {selectedPackage.pickup_address && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedPackage.pickup_address)}`, '_blank')}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Open in Maps
                    </Button>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold">Delivery Address</p>
                  <p className="text-sm">{selectedPackage.delivery_address}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedPackage.delivery_address)}`, '_blank')}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Open in Maps
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold">Package Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Description:</span>
                    <p>{selectedPackage.package_description || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Weight:</span>
                    <p>{selectedPackage.package_weight || 0}kg</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Dimensions:</span>
                    <p>{selectedPackage.package_dimensions || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Delivery Type:</span>
                    <p>{selectedPackage.delivery_type || 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-3">
                  {selectedPackage.requires_signature && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">📝 Signature Required</span>
                  )}
                  {selectedPackage.is_fragile && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">⚠️ Fragile Item</span>
                  )}
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <p className="font-semibold">Payment</p>
                <p className="text-2xl font-bold text-green">R{parseFloat(selectedPackage.total).toFixed(2)}</p>
                <p className="text-xs text-gray-500">Status: {selectedPackage.payment_status || 'Pending'}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => approvePackage(selectedPackage.id)} 
                  disabled={approving}
                  className="flex-1 bg-green text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Send to Drivers
                </Button>
                <Button 
                  onClick={() => {
                    const reason = prompt('Enter rejection reason:');
                    if (reason) {
                      setRejectionReason(reason);
                      rejectPackage(selectedPackage.id);
                    }
                  }} 
                  disabled={approving}
                  variant="destructive" 
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}