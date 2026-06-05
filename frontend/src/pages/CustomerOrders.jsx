import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { 
  Package, ChevronDown, ChevronUp, MapPin, Truck, CheckCircle, 
  AlertCircle, Navigation, Star, Search, Phone, RotateCcw, 
  Calendar, Clock as ClockIcon, MessageCircle, User, Bike, Car
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReviewModal from '@/components/ReviewModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import TicketResponseModal from '@/components/TicketResponseModal';
import { formatOrderStatus } from '@/lib/utils';

// Order status steps for tracker
const STATUS_STEPS = [
  { key: 'pending', label: 'Placed', step: 1 },
  { key: 'confirmed', label: 'Confirmed', step: 2 },
  { key: 'preparing', label: 'Preparing', step: 3 },
  { key: 'ready_for_pickup', label: 'Ready', step: 4 },
  { key: 'picked_up', label: 'Picked', step: 5 },
  { key: 'on_the_way', label: 'On Way', step: 6 },
  { key: 'delivered', label: 'Delivered', step: 7 },
];

const getCurrentStep = (status) => {
  const step = STATUS_STEPS.find(s => s.key === status);
  return step ? step.step : 0;
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Helper function to mark orders as viewed
const markOrdersAsViewed = (orderIds) => {
  const viewed = localStorage.getItem('viewed_orders');
  const viewedOrders = viewed ? JSON.parse(viewed) : [];
  const newViewed = [...new Set([...viewedOrders, ...orderIds])];
  localStorage.setItem('viewed_orders', JSON.stringify(newViewed));
};

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

// Issue type labels for tickets
const issueTypeLabels = {
  late_delivery: '⏰ Late Delivery',
  wrong_item: '❌ Wrong Item',
  missing_item: '📦 Missing Item',
  damaged_item: '💔 Damaged Item',
  driver_issue: '🚚 Driver Issue',
  payment_issue: '💰 Payment Issue',
  other: '📝 Other',
};

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

// Driver Info Card Component
function DriverInfoCard({ driver }) {
  if (!driver || !driver.id) return null;

  return (
    <div className="bg-blue-50 rounded-lg p-3 mt-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
          {driver.name?.charAt(0).toUpperCase() || 'D'}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{driver.name || 'Driver'}</p>
            <Badge className="bg-green-100 text-green-700 text-[10px]">
              <Truck className="w-2.5 h-2.5 mr-1" />
              Your Driver
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {driver.phone && (
              <>
                <a 
                  href={`tel:${driver.phone}`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  Call
                </a>
                <a 
                  href={`https://wa.me/${formatWhatsAppNumber(driver.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
        
        {driver.vehicle_type && (
          <div className="text-right">
            {driver.vehicle_type === 'car' ? (
              <Car className="w-5 h-5 text-blue-500" />
            ) : (
              <Bike className="w-5 h-5 text-green" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Live Map Component
let L = null;

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
        .bindPopup('<b>Your Driver</b><br>En route to your location!');
      
      mapRef.current.setView([driverLocation.lat, driverLocation.lng], 14);
    }
  }, [driverLocation, orderStatus, L, mapLoaded]);

  if (!mapLoaded) {
    return (
      <div className="h-40 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-green"></div>
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
        <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-green animate-pulse" />
        <span className="text-xs font-medium text-green">Live Driver Location</span>
      </div>
      <div 
        ref={mapContainerRef} 
        className="w-full h-40 sm:h-48 rounded-lg overflow-hidden border shadow-sm"
      />
      <p className="text-xs text-gray-500 text-center mt-2">
        Driver is en route to your location
      </p>
    </div>
  );
}

// Active order card component
function ActiveOrderCard({ order, onCancel, onReorder, onReportIssue, driverLocation }) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = getCurrentStep(order.status);

  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
  const itemCount = items.length;
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const showMap = order.status === 'on_the_way';

  const estimatedDeliveryTime = () => {
    if (order.status === 'on_the_way') return 'Arriving soon';
    if (order.status === 'confirmed') return 'Preparing (15-25 min)';
    if (order.status === 'preparing') return 'Almost ready (10-15 min)';
    return 'Estimated 25-35 min';
  };

  return (
    <Card className="overflow-hidden border-2 border-green/20 shadow-md">
      <div className="bg-gradient-to-r from-green to-green/80 px-3 sm:px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" />
          <span className="text-white text-xs sm:text-sm font-semibold">Live Order</span>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="w-3 h-3 text-white" />
          <span className="text-white/80 text-[10px] sm:text-xs">
            {estimatedDeliveryTime()}
          </span>
        </div>
      </div>
      
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Order Tracker */}
        <div className="relative overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex justify-between min-w-[500px] sm:min-w-0">
            {STATUS_STEPS.map((step) => (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all",
                  currentStep >= step.step 
                    ? "bg-green text-white" 
                    : "bg-gray-200 text-gray-400"
                )}>
                  {currentStep > step.step ? (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="text-[10px] sm:text-xs">{step.step}</span>
                  )}
                </div>
                <span className={cn(
                  "text-[9px] sm:text-xs mt-1 text-center whitespace-nowrap",
                  currentStep >= step.step ? "text-green font-medium" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Info Card */}
        {(order.driver_id || order.driver_name) && (
          <DriverInfoCard driver={{
            id: order.driver_id,
            name: order.driver_name,
            phone: order.driver_phone,
            vehicle_type: order.driver_vehicle_type
          }} />
        )}

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Total</p>
            <p className="font-bold text-green text-sm sm:text-lg">R{Number(order.total).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Items</p>
            <p className="font-semibold text-xs sm:text-sm">{itemCount} item(s)</p>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2 sm:p-3">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
          <span className="text-xs sm:text-sm break-words flex-1">{order.delivery_address || 'No address provided'}</span>
        </div>

        {/* Package Details - For Non-Food Deliveries */}
        {order.delivery_type && order.delivery_type !== 'food' && (
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Package Details
            </p>
            
            {/* Pickup Address */}
            {order.pickup_address && (
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="w-3 h-3 text-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Pickup Address</p>
                  <p className="text-xs font-medium">{order.pickup_address}</p>
                </div>
              </div>
            )}
            
            {/* Recipient Info */}
            {order.recipient_name && (
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-xs">Recipient: {order.recipient_name}</span>
                </div>
                {order.recipient_phone && (
                  <a 
                    href={`tel:${order.recipient_phone}`} 
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    Call Recipient
                  </a>
                )}
              </div>
            )}
            
            {/* Package Specs */}
            <div className="flex flex-wrap gap-3 text-xs mt-2">
              {order.package_weight && (
                <span className="flex items-center gap-1">
                  <span>⚖️</span> {order.package_weight}kg
                </span>
              )}
              {order.package_dimensions && (
                <span className="flex items-center gap-1">
                  <span>📏</span> {order.package_dimensions}
                </span>
              )}
              {order.requires_signature && (
                <span className="flex items-center gap-1 text-blue-600">
                  <span>📝</span> Signature Required
                </span>
              )}
              {order.is_fragile && (
                <span className="flex items-center gap-1 text-orange-600">
                  <span>⚠️</span> Fragile Item
                </span>
              )}
            </div>
            
            {/* Package Description */}
            {order.package_description && (
              <p className="text-xs text-gray-600 mt-2 pt-1 border-t border-purple-200">
                📦 {order.package_description}
              </p>
            )}
          </div>
        )}

        {/* Status Messages */}
        {order.status === 'confirmed' && (
          <div className="bg-blue-50 p-2 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-blue-700">⏱️ Restaurant is preparing your order</p>
          </div>
        )}
        {order.status === 'ready_for_pickup' && (
          <div className="bg-purple-50 p-2 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-purple-700">🍔 Order ready! Driver assigned</p>
          </div>
        )}
        {order.status === 'picked_up' && (
          <div className="bg-indigo-50 p-2 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-indigo-700">🚚 Driver has picked up your order</p>
          </div>
        )}

        {/* Live Map */}
        {showMap && driverLocation && (
          <LiveMap driverLocation={driverLocation} orderStatus={order.status} />
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onCancel(order.id)}
            >
              Cancel Order
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9"
            onClick={() => onReorder(order)}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Order Again
          </Button>
          {/* Report Issue Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9"
            onClick={() => onReportIssue(order)}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Report Issue
          </Button>
        </div>

        {/* Order Items Expandable */}
        {items.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-xs sm:text-sm text-gray-500 hover:text-gray-700"
          >
            <span>View order details</span>
            {expanded ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        )}

        {expanded && items.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-medium">R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
              <span className="text-gray-600">Delivery fee</span>
              <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
            </div>
            {order.discount_applied > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-green">
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
function OrderHistoryCard({ order, onReviewOrder, onReorder }) {
  const [expanded, setExpanded] = useState(false);
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors py-3 sm:py-4 px-3 sm:px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {order.restaurant_name || 'Restaurant'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy') : ''}
                </p>
                {order.delivered_at && (
                  <p className="text-[10px] text-green-500">✓ Delivered</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${getStatusColor(order.status)} whitespace-nowrap`}>
              {formatOrderStatus(order.status)}
            </span>
            <span className="font-bold text-green text-xs sm:text-sm whitespace-nowrap">R{Number(order.total).toFixed(2)}</span>
            {expanded ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" />}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-3 border-t px-3 sm:px-4">
          <div className="space-y-1 pt-3">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
            <span className="text-gray-500">Delivery fee</span>
            <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
          </div>
          {order.discount_applied > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-green">
              <span>Discount</span>
              <span>-R{Number(order.discount_applied).toFixed(2)}</span>
            </div>
          )}
          {order.delivery_address && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-500">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
              <span className="break-words flex-1">{order.delivery_address}</span>
            </div>
          )}
          
          {/* Driver Info in History */}
          {order.driver_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
              <Truck className="w-3 h-3" />
              <span>Delivered by: {order.driver_name}</span>
              {order.driver_phone && (
                <a 
                  href={`tel:${order.driver_phone}`}
                  className="text-blue-600 hover:underline ml-auto"
                >
                  <Phone className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
          
          {/* Package delivery history note */}
          {order.delivery_type && order.delivery_type !== 'food' && (
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-lg">
              📦 Package Delivery
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            {order.status === 'delivered' && !order.reviewed && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-yellow-400 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => onReviewOrder(order)}
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Rate
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onReorder(order)}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Order Again
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function CustomerOrders() {
  const { socket, online } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  const [liveUpdates, setLiveUpdates] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  // Fetch user tickets when modal opens
  const fetchUserTickets = async () => {
    try {
      const response = await api.get('/support/my-tickets');
      setUserTickets(response.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  useEffect(() => {
    if (showTicketsModal) {
      fetchUserTickets();
    }
  }, [showTicketsModal]);

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

  // Handle reorder
  const handleReorder = (order) => {
    const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
    
    if (window.confirm(`Add items from ${order.restaurant_name} to your cart? This will replace your current cart.`)) {
      items.forEach(item => {
        addToCart({
          id: item.id || item.menu_item_id,
          name: item.name,
          price: item.price,
          image: item.image_url
        }, order.restaurant_id, order.restaurant_name);
      });
      toast.success(`${items.length} items added to cart from ${order.restaurant_name}`);
      navigate('/cart');
    }
  };

  const handleReviewOrder = (order) => {
    setSelectedOrder(order);
    setShowReviewModal(true);
  };

  const handleReportIssue = (order) => {
    setSelectedOrderForIssue(order);
    setShowIssueModal(true);
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
        toast.info(`Order #${data.orderId} updated to ${formatOrderStatus(data.status)}`);
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
  
  // Mark active orders as viewed when they load
  useEffect(() => {
    if (activeOrders.length > 0) {
      const orderIds = activeOrders.map(o => o.id);
      markOrdersAsViewed(orderIds);
    }
  }, [activeOrders]);
  
  // Filter past orders by search term
  const pastOrders = orders.filter(o => !activeStatuses.includes(o.status));
  const filteredPastOrders = pastOrders.filter(order => 
    order.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id?.toString().includes(searchTerm)
  );
  
  // Pagination
  const displayedPastOrders = filteredPastOrders.slice(0, visibleCount);
  const hasMore = filteredPastOrders.length > visibleCount;

  const loadMore = () => setVisibleCount(prev => prev + 10);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center py-8 sm:py-12 bg-white rounded-xl border">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500">Failed to load orders</p>
          <button 
            onClick={() => refetch()} 
            className="mt-3 sm:mt-4 text-green hover:underline text-sm sm:text-base"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">My Orders</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTicketsModal(true)}
            className="text-xs"
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            My Tickets
          </Button>
          {online && (
            <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              🟢 Live updates active
            </span>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-xl border">
          <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No orders yet</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Browse restaurants and place your first order</p>
          <Button onClick={() => navigate('/')} className="mt-4 bg-green text-white">
            Browse Restaurants
          </Button>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 sm:mb-4">
                Active Orders ({activeOrders.length})
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {activeOrders.map(order => (
                  <ActiveOrderCard 
                    key={order.id} 
                    order={liveUpdates[order.id] ? { ...order, status: liveUpdates[order.id] } : order}
                    onCancel={handleCancelOrder}
                    onReorder={handleReorder}
                    onReportIssue={handleReportIssue}
                    driverLocation={driverLocation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Order History */}
          {pastOrders.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Order History ({filteredPastOrders.length} of {pastOrders.length})
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input
                    placeholder="Search by restaurant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {displayedPastOrders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No orders match your search</p>
                  </div>
                ) : (
                  <>
                    {displayedPastOrders.map(order => (
                      <OrderHistoryCard 
                        key={order.id} 
                        order={order} 
                        onReviewOrder={handleReviewOrder}
                        onReorder={handleReorder}
                      />
                    ))}
                    
                    {hasMore && (
                      <Button
                        onClick={loadMore}
                        variant="outline"
                        className="w-full mt-2"
                      >
                        Load More Orders ({filteredPastOrders.length - visibleCount} remaining)
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Report Issue Modal */}
      {showIssueModal && selectedOrderForIssue && (
        <ReportIssueModal
          order={selectedOrderForIssue}
          isOpen={showIssueModal}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedOrderForIssue(null);
          }}
          onSubmitted={() => {
            refetch();
            toast.info('Support ticket created. We\'ll respond within 24 hours.');
          }}
        />
      )}

      {/* Tickets Modal */}
      <Dialog open={showTicketsModal} onOpenChange={setShowTicketsModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Support Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {userTickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No support tickets</p>
                <p className="text-xs text-gray-400">Report an issue from an active order</p>
              </div>
            ) : (
              userTickets.map((ticket) => (
                <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelectedTicket(ticket)}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">#{ticket.id}</p>
                        <p className="text-xs text-gray-500">{issueTypeLabels[ticket.issue_type] || ticket.issue_type}</p>
                      </div>
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{ticket.description}</p>
                    {ticket.admin_response && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-green-600 font-medium">📨 Response received</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">
                      {format(new Date(ticket.created_at), 'dd MMM yyyy')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <Button onClick={() => setShowTicketsModal(false)} variant="outline" className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Ticket Response Modal */}
      {selectedTicket && (
        <TicketResponseModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
        />
      )}
    </div>
  );
}