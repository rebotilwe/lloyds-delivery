import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Eye,
  Truck,
  Navigation,
  RefreshCw,
  Loader2,
  User,
  Package,
  ShoppingBag,
  DollarSign,
  Calendar,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedPrepTime, setEstimatedPrepTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [showDriverMap, setShowDriverMap] = useState(false);
  const { socket, online } = useSocket();

  useEffect(() => {
    fetchOrders();
  }, []);

  // Listen for new orders via socket
  useEffect(() => {
    if (socket && online) {
      socket.on('new-order', () => {
        fetchOrders();
        toast.info('New order received!', {
          duration: 5000,
        });
      });

      // Listen for driver acceptance
      socket.on('order-accepted-by-driver', (data) => {
        toast.info(`🚚 Driver has accepted order #${data.orderId} and is on the way!`);
        fetchOrders();
      });

      // Listen for delivery completion
      socket.on('order-delivered', (data) => {
        toast.success(`✅ Order #${data.orderId} has been delivered to the customer!`);
        fetchOrders();
      });

      // Listen for driver location updates
      socket.on('driver-location-update', (data) => {
        if (data.orderId === selectedOrder?.id) {
          setDriverLocation({ lat: data.lat, lng: data.lng });
        }
      });

      return () => {
        socket.off('new-order');
        socket.off('order-accepted-by-driver');
        socket.off('order-delivered');
        socket.off('driver-location-update');
      };
    }
  }, [socket, online, selectedOrder]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/orders');
      let ordersData = [];
      if (response && response.data) {
        ordersData = response.data;
      } else if (response && Array.isArray(response)) {
        ordersData = response;
      }
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success('Orders refreshed');
  };

  const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    try {
      await api.put(`/vendor/orders/${orderId}/status`, {
        status,
        ...additionalData,
      });
      toast.success(`Order ${status === 'rejected' ? 'rejected' : 'updated'} successfully`);
      fetchOrders();
      setShowDetails(false);
      setRejectionReason('');
      setEstimatedPrepTime('');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const handleAcceptOrder = (order) => {
    setSelectedOrder(order);
    setEstimatedPrepTime('');
    setRejectionReason('');
    setShowDetails(true);
  };

  const confirmAccept = () => {
    if (!estimatedPrepTime) {
      toast.error('Please enter estimated preparation time');
      return;
    }
    updateOrderStatus(selectedOrder.id, 'confirmed', { estimated_prep_time: estimatedPrepTime });
  };

  const handleRejectOrder = (order) => {
    setSelectedOrder(order);
    setRejectionReason('');
    setEstimatedPrepTime('');
    setShowDetails(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateOrderStatus(selectedOrder.id, 'rejected', { rejection_reason: rejectionReason });
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
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const openGoogleMaps = (address) => {
    if (!address) {
      toast.error('No address available');
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
  };

  const openGoogleMapsWithDirections = (fromAddress, toAddress) => {
    const encodedFrom = encodeURIComponent(fromAddress || '');
    const encodedTo = encodeURIComponent(toAddress || '');
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${encodedFrom}&destination=${encodedTo}&travelmode=driving`,
      '_blank'
    );
  };

  const viewDriverLocation = (order) => {
    if (order.driver_id && order.delivery_address) {
      setSelectedOrder(order);
      setShowDriverMap(true);
      // Request current driver location
      if (socket && online) {
        socket.emit('get-driver-location', { orderId: order.id });
      }
    } else {
      toast.error('No driver assigned to this order yet');
    }
  };

  const pendingOrders = (orders || []).filter(o => o?.status === 'pending');
  const activeOrders = (orders || []).filter(o => ['confirmed', 'preparing'].includes(o?.status));
  const completedOrders = (orders || []).filter(o => ['ready_for_pickup', 'picked_up', 'on_the_way', 'delivered'].includes(o?.status));

  const OrderCard = ({ order }) => {
    const isPackage = order.delivery_type && order.delivery_type !== 'food';
    const hasDriver = order.driver_id || order.driver_name;
    
    return (
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <p className="font-semibold">Order #{order.id}</p>
                {getStatusBadge(order.status)}
                {isPackage && (
                  <Badge className="bg-purple-100 text-purple-800">
                    📦 Package
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{order.customer_name || 'Guest'}</p>
              
              {/* Driver Info - Show if assigned */}
              {hasDriver && (
                <div className="flex items-center gap-2 mt-1">
                  <Truck className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Driver: {order.driver_name || `Driver #${order.driver_id}`}
                  </p>
                  {order.driver_phone && (
                    <a href={`tel:${order.driver_phone}`} className="text-xs text-blue-500 hover:underline">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Call
                    </a>
                  )}
                </div>
              )}
              
              {/* Delivery Address with Map Link */}
              {order.delivery_address && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {order.delivery_address}
                  </p>
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
              
              <p className="text-xs text-gray-400 mt-1">
                {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, h:mm a') : '-'}
              </p>
              
              {/* Items Preview */}
              <div className="mt-2">
                <p className="text-xs text-gray-500">Items:</p>
                {order.items?.slice(0, 2).map((item, idx) => (
                  <p key={idx} className="text-xs">{item.quantity}x {item.name}</p>
                ))}
                {order.items?.length > 2 && (
                  <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-green text-lg">R{Number(order.total || 0).toFixed(2)}</p>
              
              {/* Status-specific actions */}
              {order.status === 'pending' && (
                <div className="flex flex-wrap gap-2 mt-2 justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptOrder(order)}
                    className="bg-green text-white"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectOrder(order)}
                    className="border-red-300 text-red-500"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              
              {order.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="bg-blue-500 text-white mt-2"
                >
                  Start Preparing
                </Button>
              )}
              
              {order.status === 'preparing' && (
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                  className="bg-purple-500 text-white mt-2"
                >
                  Mark Ready
                </Button>
              )}
              
              {/* View Driver Location */}
              {hasDriver && (order.status === 'picked_up' || order.status === 'on_the_way') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewDriverLocation(order)}
                  className="mt-2 border-blue-300 text-blue-600"
                >
                  <Truck className="w-3 h-3 mr-1" />
                  Track Driver
                </Button>
              )}
              
              <div className="flex gap-1 mt-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowDetails(true);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Driver Location Map Component
  const DriverLocationMap = ({ order, onClose }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(false);
    const mapRef = React.useRef(null);
    const mapContainerRef = React.useRef(null);

    React.useEffect(() => {
      if (!GOOGLE_MAPS_API_KEY) {
        setMapError(true);
        return;
      }

      // Load Google Maps script
      const loadScript = () => {
        if (window.google?.maps) {
          initMap();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        script.onerror = () => setMapError(true);
        document.head.appendChild(script);
      };

      const initMap = () => {
        if (!mapContainerRef.current) return;
        
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          zoom: 14,
          center: { lat: -29.8587, lng: 31.0218 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });
        
        // Geocode delivery address
        if (order.delivery_address) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: order.delivery_address }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const destPos = results[0].geometry.location;
              new window.google.maps.Marker({
                position: destPos,
                map: mapRef.current,
                title: 'Delivery Address',
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#dc2626" stroke="white" stroke-width="3"/><text x="18" y="24" text-anchor="middle" font-size="16">📍</text></svg>'
                  ),
                  scaledSize: new window.google.maps.Size(36, 36),
                  anchor: new window.google.maps.Point(18, 18),
                },
              });
              
              // If we have driver location, add that too
              if (driverLocation) {
                new window.google.maps.Marker({
                  position: { lat: driverLocation.lat, lng: driverLocation.lng },
                  map: mapRef.current,
                  title: 'Driver Location',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#16a34a" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="18">🚚</text></svg>'
                    ),
                    scaledSize: new window.google.maps.Size(40, 40),
                    anchor: new window.google.maps.Point(20, 20),
                  },
                });
              }
              
              mapRef.current.fitBounds(
                new window.google.maps.LatLngBounds(
                  destPos,
                  driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : destPos
                ),
                { padding: 80 }
              );
            }
          });
        }
        
        setMapLoaded(true);
      };

      loadScript();

      return () => {
        if (mapRef.current) {
          mapRef.current = null;
        }
      };
    }, [order, driverLocation]);

    if (mapError || !GOOGLE_MAPS_API_KEY) {
      return (
        <div className="p-4 text-center">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800 font-medium">Map unavailable</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => openGoogleMaps(order.delivery_address)}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Open in Google Maps
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div 
          ref={mapContainerRef} 
          className="w-full h-64 rounded-lg overflow-hidden border"
        />
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {driverLocation ? (
              <span className="text-green-600">🟢 Driver location available</span>
            ) : (
              <span className="text-yellow-600">⏳ Waiting for driver location...</span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openGoogleMapsWithDirections(
              order.driver_address || '',
              order.delivery_address
            )}
          >
            <Navigation className="w-3 h-3 mr-1" />
            Get Directions
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-gray-500">Manage incoming orders from customers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {online ? <><Wifi className="w-3 h-3 inline mr-1" /> Live</> : <><WifiOff className="w-3 h-3 inline mr-1" /> Offline</>}
          </span>
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg font-bold">{pendingOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-bold">{activeOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold">{completedOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-lg font-bold">{orders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                No pending orders
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                No active orders
              </CardContent>
            </Card>
          ) : (
            activeOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                No completed orders
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order #{selectedOrder?.id}
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Information */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Customer Information
                </h3>
                <p className="text-sm">{selectedOrder.customer_name || 'Guest'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{selectedOrder.customer_email}</span>
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{selectedOrder.customer_phone}</span>
                    <a href={`tel:${selectedOrder.customer_phone}`} className="text-xs text-blue-500 hover:underline">
                      Call
                    </a>
                  </div>
                )}
              </div>

              {/* Driver Information */}
              {selectedOrder.driver_id && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Truck className="w-3 h-3 text-blue-600" />
                    Driver Information
                  </h3>
                  <p className="text-sm">Driver: {selectedOrder.driver_name || `#${selectedOrder.driver_id}`}</p>
                  {selectedOrder.driver_phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <a href={`tel:${selectedOrder.driver_phone}`} className="text-xs text-blue-500 hover:underline">
                        {selectedOrder.driver_phone}
                      </a>
                    </div>
                  )}
                  {(selectedOrder.status === 'picked_up' || selectedOrder.status === 'on_the_way') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-blue-300 text-blue-600"
                      onClick={() => {
                        setShowDetails(false);
                        viewDriverLocation(selectedOrder);
                      }}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Track Driver
                    </Button>
                  )}
                </div>
              )}

              {/* Delivery Address */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-red-500" />
                  Delivery Address
                </h3>
                <p className="text-sm">{selectedOrder.delivery_address || 'No address'}</p>
                {selectedOrder.delivery_address && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => openGoogleMaps(selectedOrder.delivery_address)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Open in Maps
                  </Button>
                )}
              </div>

              {/* Package Details */}
              {selectedOrder.delivery_type && selectedOrder.delivery_type !== 'food' && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Package className="w-3 h-3 text-purple-600" />
                    Package Details
                  </h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.package_weight && (
                      <p>Weight: {selectedOrder.package_weight}kg</p>
                    )}
                    {selectedOrder.package_dimensions && (
                      <p>Dimensions: {selectedOrder.package_dimensions}</p>
                    )}
                    {selectedOrder.is_fragile && (
                      <p className="text-orange-600">⚠️ Fragile Item</p>
                    )}
                    {selectedOrder.requires_signature && (
                      <p className="text-blue-600">📝 Signature Required</p>
                    )}
                    {selectedOrder.package_description && (
                      <p>Description: {selectedOrder.package_description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>R{Number(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_applied > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-R{Number(selectedOrder.discount_applied).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span className="text-green">R{Number(selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              {selectedOrder.created_at && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Order Timeline
                  </h3>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>🕐 Placed: {format(new Date(selectedOrder.created_at), 'dd MMM yyyy, h:mm a')}</p>
                    {selectedOrder.confirmed_at && (
                      <p>✅ Confirmed: {format(new Date(selectedOrder.confirmed_at), 'dd MMM yyyy, h:mm a')}</p>
                    )}
                    {selectedOrder.ready_at && (
                      <p>🟢 Ready: {format(new Date(selectedOrder.ready_at), 'dd MMM yyyy, h:mm a')}</p>
                    )}
                    {selectedOrder.picked_up_at && (
                      <p>🚚 Picked Up: {format(new Date(selectedOrder.picked_up_at), 'dd MMM yyyy, h:mm a')}</p>
                    )}
                    {selectedOrder.delivered_at && (
                      <p>✅ Delivered: {format(new Date(selectedOrder.delivered_at), 'dd MMM yyyy, h:mm a')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Actions */}
              {selectedOrder.status === 'pending' && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Estimated Preparation Time (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 20"
                      value={estimatedPrepTime}
                      onChange={(e) => setEstimatedPrepTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-red-600">Rejection Reason (required if rejecting)</Label>
                    <Textarea
                      placeholder="Why are you rejecting this order? (e.g., Out of stock, too busy, etc.)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="mt-1 border-red-300 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This reason will be shared with the customer
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={confirmAccept} className="flex-1 bg-green text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Order
                    </Button>
                    <Button onClick={confirmReject} variant="destructive" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Order
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.status === 'rejected' && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm text-red-800 mb-2">Rejection Reason</h3>
                  <p className="text-sm text-red-700">
                    {selectedOrder.rejection_reason || 'No reason provided'}
                  </p>
                </div>
              )}

              {selectedOrder.status === 'delivered' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm text-green-800 mb-2">Order Complete</h3>
                  <p className="text-sm text-green-700">
                    This order has been delivered successfully.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Driver Location Map Modal */}
      <Dialog open={showDriverMap} onOpenChange={setShowDriverMap}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Driver Location - Order #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <DriverLocationMap order={selectedOrder} onClose={() => setShowDriverMap(false)} />
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowDriverMap(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}