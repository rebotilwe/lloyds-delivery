import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Package, ChevronDown, ChevronUp, MapPin, Truck, CheckCircle, AlertCircle, Navigation, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReviewModal from '@/components/ReviewModal';

// Order status steps for tracker
const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', step: 1 },
  { key: 'confirmed', label: 'Confirmed', step: 2 },
  { key: 'preparing', label: 'Preparing', step: 3 },
  { key: 'ready_for_pickup', label: 'Ready', step: 4 },
  { key: 'picked_up', label: 'Picked Up', step: 5 },
  { key: 'on_the_way', label: 'On the Way', step: 6 },
  { key: 'delivered', label: 'Delivered', step: 7 },
];

// Get current step index
const getCurrentStep = (status) => {
  const step = STATUS_STEPS.find(s => s.key === status);
  return step ? step.step : 0;
};

// Helper for className merging
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Live Map Component (inline for now)
let L = null;
let mapInitialized = false;

function LiveMap({ driverLocation, orderStatus }) {
  const mapRef = React.useRef(null);
  const mapContainerRef = React.useRef(null);
  const driverMarkerRef = React.useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!L && typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        L = leaflet.default;
        setMapLoaded(true);
      });
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([-29.65, 31.05], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !L || !mapLoaded) return;

    if (driverMarkerRef.current) driverMarkerRef.current.remove();

    if (driverLocation?.lat && driverLocation?.lng && orderStatus === 'on_the_way') {
      const driverIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><span style="font-size: 18px;">🚚</span></div>`,
        iconSize: [32, 32],
        popupAnchor: [0, -15]
      });
      
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>Driver</b><br>Your delivery is on the way!');
      
      mapRef.current.setView([driverLocation.lat, driverLocation.lng], 14);
    }
  }, [driverLocation, orderStatus, L, mapLoaded]);

  if (!mapLoaded) {
    return (
      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green"></div>
        <span className="ml-2 text-xs text-gray-500">Loading map...</span>
      </div>
    );
  }

  if (!driverLocation?.lat || !driverLocation?.lng || orderStatus !== 'on_the_way') {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Navigation className="w-4 h-4 text-green animate-pulse" />
        <span className="text-xs font-medium text-green">Live Driver Location</span>
      </div>
      <div 
        ref={mapContainerRef} 
        className="w-full h-48 rounded-lg overflow-hidden border shadow-sm"
      />
      <p className="text-xs text-gray-500 text-center mt-2">
        Driver is en route to your location
      </p>
    </div>
  );
}

// Active order card component
function ActiveOrderCard({ order, onCancel, currentUserId, driverLocation }) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = getCurrentStep(order.status);

  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
  const itemCount = items.length;
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const showMap = order.status === 'on_the_way';

  return (
    <Card className="overflow-hidden border-2 border-green/20 shadow-md">
      <div className="bg-gradient-to-r from-green to-green/80 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-white animate-pulse" />
          <span className="text-white text-sm font-semibold">Live Order</span>
        </div>
        <span className="text-white/80 text-xs">{order.restaurant_name || 'Restaurant'}</span>
      </div>
      
      <CardContent className="pt-4 space-y-4">
        {/* Order Tracker */}
        <div className="relative">
          <div className="flex justify-between">
            {STATUS_STEPS.map((step) => (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  currentStep >= step.step 
                    ? "bg-green text-white" 
                    : "bg-gray-200 text-gray-400"
                )}>
                  {currentStep > step.step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.step
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-1 text-center hidden md:block",
                  currentStep >= step.step ? "text-green font-medium" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div 
              className="h-full bg-green transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="font-bold text-green text-lg">R{Number(order.total).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Items</p>
            <p className="font-semibold">{itemCount} item(s)</p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{order.delivery_address || 'No address provided'}</span>
        </div>

        {/* Status Message */}
        {order.status === 'confirmed' && (
          <div className="bg-blue-50 p-2 rounded-lg text-center">
            <p className="text-xs text-blue-700">⏱️ Restaurant is preparing your order</p>
          </div>
        )}
        {order.status === 'ready_for_pickup' && (
          <div className="bg-purple-50 p-2 rounded-lg text-center">
            <p className="text-xs text-purple-700">🍔 Order ready! Driver assigned</p>
          </div>
        )}
        {order.status === 'picked_up' && (
          <div className="bg-indigo-50 p-2 rounded-lg text-center">
            <p className="text-xs text-indigo-700">🚚 Driver has picked up your order</p>
          </div>
        )}

        {/* Live Map - Only for on_the_way status */}
        {showMap && driverLocation && (
          <LiveMap driverLocation={driverLocation} orderStatus={order.status} />
        )}

        {/* Cancel Button */}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onCancel(order.id)}
          >
            Cancel Order
          </Button>
        )}

        {/* Order Items (Expandable) */}
        {items.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-sm text-gray-500 hover:text-gray-700"
          >
            <span>View order details</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {expanded && items.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-medium">R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Delivery fee</span>
              <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
            </div>
            {order.discount_applied > 0 && (
              <div className="flex justify-between text-sm text-green">
                <span>Discount</span>
                <span>-R{Number(order.discount_applied).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Order history card component
function OrderHistoryCard({ order, onReviewOrder }) {
  const [expanded, setExpanded] = useState(false);
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusText = (status) => {
    return status?.replace(/_/g, ' ').toUpperCase() || 'PENDING';
  };

  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 leading-tight">
                {order.restaurant_name || 'Restaurant'}
              </h3>
              <p className="text-xs text-gray-500">
                {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
            <span className="font-bold text-green whitespace-nowrap">R{Number(order.total).toFixed(2)}</span>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-3 border-t">
          <div className="space-y-1 pt-3">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-gray-500">Delivery fee</span>
            <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
          </div>
          {order.discount_applied > 0 && (
            <div className="flex justify-between text-sm text-green">
              <span>Discount</span>
              <span>-R{Number(order.discount_applied).toFixed(2)}</span>
            </div>
          )}
          {order.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{order.delivery_address}</span>
            </div>
          )}
          
          {/* Review Button */}
          {order.status === 'delivered' && !order.reviewed && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              onClick={() => onReviewOrder(order)}
            >
              <Star className="w-4 h-4 mr-1" /> Rate this order
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CustomerOrders() {
  const { socket, online } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liveUpdates, setLiveUpdates] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Listen for driver location updates
  useEffect(() => {
    if (socket && online) {
      socket.on('driver-location-update', (data) => {
        console.log('Driver location update:', data);
        setDriverLocation({ lat: data.lat, lng: data.lng });
      });
      
      return () => {
        socket.off('driver-location-update');
      };
    }
  }, [socket, online]);

  // Fetch orders
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customerOrders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get(`/orders/customer/${user.id}`);
        console.log('Customer orders response:', response);
        if (Array.isArray(response)) {
          return response;
        }
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (err) {
        console.error('Error fetching orders:', err);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Handle order cancellation
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/cancel/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: user?.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel order');
      }
      
      toast.success('Order cancelled successfully');
      refetch();
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  const handleReviewOrder = (order) => {
    setSelectedOrder(order);
    setShowReviewModal(true);
  };

  // Socket connection for real-time updates
  useEffect(() => {
    if (socket && user?.id && online && orders.length > 0) {
      orders.forEach(order => {
        socket.emit('join-order', order.id);
      });
      
      const handleStatusUpdate = (data) => {
        console.log('Status update received:', data);
        setLiveUpdates(prev => ({ ...prev, [data.orderId]: data.status }));
        toast.info(`Order #${data.orderId} status updated to ${data.status?.replace(/_/g, ' ')}`);
        refetch();
      };
      
      socket.on('order-status-update', handleStatusUpdate);
      
      return () => {
        socket.off('order-status-update', handleStatusUpdate);
      };
    }
  }, [socket, user, orders, online, refetch]);

  // Filter orders
  const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'];
  const activeOrders = orders.filter(o => activeStatuses.includes(o.status));
  const pastOrders = orders.filter(o => !activeStatuses.includes(o.status));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-white rounded-xl border">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-gray-500">Failed to load orders</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 text-green hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        {online && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            🟢 Live updates active
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Browse restaurants and place your first order</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Active Orders ({activeOrders.length})
              </h2>
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <ActiveOrderCard 
                    key={order.id} 
                    order={liveUpdates[order.id] ? { ...order, status: liveUpdates[order.id] } : order}
                    onCancel={handleCancelOrder}
                    currentUserId={user?.id}
                    driverLocation={driverLocation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Order History */}
          {pastOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Order History ({pastOrders.length})
              </h2>
              <div className="space-y-3">
                {pastOrders.map(order => (
                  <OrderHistoryCard 
                    key={order.id} 
                    order={order} 
                    onReviewOrder={handleReviewOrder}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedOrder && (
        <ReviewModal
          order={selectedOrder}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            refetch();
            setShowReviewModal(false);
          }}
        />
      )}
    </div>
  );
}