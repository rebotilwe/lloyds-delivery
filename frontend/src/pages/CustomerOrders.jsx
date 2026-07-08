import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { 
  Package, ChevronDown, ChevronUp, MapPin, Truck, CheckCircle, 
  AlertCircle, Navigation, Star, Search, Phone, RotateCcw, 
  Calendar, Clock as ClockIcon, MessageCircle, User, Bike, Car,
  Lock, Loader2, XCircle, Headset, Send, KeyRound, RefreshCw,
  Wifi, WifiOff, Store
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReviewModal from '@/components/ReviewModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import TicketResponseModal from '@/components/TicketResponseModal';
import { formatOrderStatus } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const FOOD_STATUS_STEPS = [
  { key: 'pending', label: 'Placed', step: 1 },
  { key: 'confirmed', label: 'Confirmed', step: 2 },
  { key: 'preparing', label: 'Preparing', step: 3 },
  { key: 'ready_for_pickup', label: 'Ready', step: 4 },
  { key: 'picked_up', label: 'Picked', step: 5 },
  { key: 'on_the_way', label: 'On Way', step: 6 },
  { key: 'delivered', label: 'Delivered', step: 7 },
];

const PACKAGE_STATUS_STEPS = [
  { key: 'pending_approval', label: 'Pending', step: 1 },
  { key: 'rejected', label: 'Rejected', step: 2 },
  { key: 'pending_driver', label: 'Driver Search', step: 3 },
  { key: 'assigned', label: 'Driver Assigned', step: 4 },
  { key: 'picked_up', label: 'Picked Up', step: 5 },
  { key: 'on_the_way', label: 'On Way', step: 6 },
  { key: 'delivered', label: 'Delivered', step: 7 },
];

const getStatusSteps = (order) => {
  const isPackage = order.delivery_type && order.delivery_type !== 'food';
  return isPackage ? PACKAGE_STATUS_STEPS : FOOD_STATUS_STEPS;
};

const getCurrentStep = (order) => {
  const steps = getStatusSteps(order);
  const step = steps.find(s => s.key === order.status);
  return step ? step.step : 0;
};

function cn(...classes) { return classes.filter(Boolean).join(' '); }

const markOrdersAsViewed = (orderIds) => {
  const viewed = localStorage.getItem('viewed_orders');
  const viewedOrders = viewed ? JSON.parse(viewed) : [];
  localStorage.setItem('viewed_orders', JSON.stringify([...new Set([...viewedOrders, ...orderIds])]));
};

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '#';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '27' + cleaned.substring(1);
  if (!cleaned.startsWith('27')) cleaned = '27' + cleaned;
  return cleaned;
};

const issueTypeLabels = {
  late_delivery: '⏰ Late Delivery', wrong_item: '❌ Wrong Item',
  missing_item: '📦 Missing Item', damaged_item: '💔 Damaged Item',
  driver_issue: '🚚 Driver Issue', payment_issue: '💰 Payment Issue', other: '📝 Other',
};

const statusColors = {
  open: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800',
};

// ── Shared Google Maps script loader (singleton — matches AddressAutocomplete / RestaurantDetail) ──
// Never removes the script tag on unmount; Google Maps is a global resource
// that may be relied on by multiple components mounted at different times.
let mapsScriptPromise = null;

function waitForMaps(timeout = 15000) {
  return new Promise((resolve, reject) => {
    if (typeof window.google?.maps?.Map === 'function') {
      resolve();
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      if (typeof window.google?.maps?.Map === 'function') {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(id);
        reject(new Error('Timed out waiting for Google Maps'));
      }
    }, 150);
  });
}

function loadGoogleMapsScript() {
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    if (typeof window.google?.maps?.Map === 'function') {
      resolve();
      return;
    }
    if (document.getElementById('google-maps-script')) {
      waitForMaps().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    // No &loading=async — keeps places/geometry loading synchronously, avoiding race conditions
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForMaps().then(resolve).catch(reject);
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

// ── Live Map (Google Maps) ───────────────────────────────────────────────────
// Shows the driver's live position en route, with both the pickup point
// (restaurant) and the delivery destination plotted, plus the live route
// drawn between wherever the driver currently is and the destination.
function LiveMap({ driverLocation, deliveryAddress, restaurantAddress, restaurantName, orderStatus, orderId, onRequestLocation }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [locationRequestCount, setLocationRequestCount] = useState(0);
  const { socket, online } = useSocket();

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(true);
      return;
    }

    loadGoogleMapsScript()
      .then(() => setMapReady(true))
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setLoadError(true);
      });
  }, []);

  // Retry if driver location arrives before map finished loading
  useEffect(() => {
    if (driverLocation?.lat && driverLocation?.lng && !mapReady && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadGoogleMapsScript()
          .then(() => setMapReady(true))
          .catch(() => setLoadError(true));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [driverLocation, mapReady, retryCount]);

  // Show fallback UI after 10s of waiting for first location
  useEffect(() => {
    if (!driverLocation?.lat && !driverLocation?.lng && orderStatus === 'on_the_way') {
      const timer = setTimeout(() => setShowFallback(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [driverLocation, orderStatus]);

  // Auto-request location periodically if we still don't have one
  useEffect(() => {
    if (!driverLocation?.lat && !driverLocation?.lng && orderStatus === 'on_the_way' && online && socket) {
      const interval = setInterval(() => {
        setLocationRequestCount(prev => prev + 1);
        onRequestLocation?.();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [driverLocation, orderStatus, online, socket, onRequestLocation]);

  // Initialize map instance once
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;
    if (typeof window.google?.maps?.Map !== 'function') return;

    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 13,
      center: { lat: -29.8587, lng: 31.0218 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#16a34a', strokeWeight: 4, strokeOpacity: 0.85 },
    });
    directionsRendererRef.current.setMap(mapRef.current);

    return () => {
      mapRef.current = null;
      driverMarkerRef.current = null;
      destinationMarkerRef.current = null;
      restaurantMarkerRef.current = null;
    };
  }, [mapReady]);

  // Plot restaurant marker (static point, geocoded once)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !restaurantAddress || restaurantMarkerRef.current) return;
    if (orderStatus !== 'on_the_way' && orderStatus !== 'picked_up') return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: restaurantAddress }, (results, status) => {
      if (status !== 'OK' || !results[0] || !mapRef.current) return;
      restaurantMarkerRef.current = new window.google.maps.Marker({
        position: results[0].geometry.location,
        map: mapRef.current,
        title: restaurantName || 'Restaurant',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#f59e0b" stroke="white" stroke-width="3"/><text x="17" y="22" text-anchor="middle" font-size="15">🍽️</text></svg>'
          ),
          scaledSize: new window.google.maps.Size(34, 34),
          anchor: new window.google.maps.Point(17, 17),
        },
      });
    });
  }, [mapReady, restaurantAddress, restaurantName, orderStatus]);

  // Plot/update driver marker + destination marker + live route
  useEffect(() => {
    if (!mapRef.current || !mapReady || !driverLocation?.lat || !driverLocation?.lng || orderStatus !== 'on_the_way') return;

    const driverPos = { lat: driverLocation.lat, lng: driverLocation.lng };

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(driverPos);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: driverPos,
        map: mapRef.current,
        title: 'Your Driver',
        zIndex: 999,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#16a34a" stroke="white" stroke-width="3"/><text x="20" y="26" text-anchor="middle" font-size="18">🚚</text></svg>'
          ),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        },
      });
    }

    if (deliveryAddress && !destinationMarkerRef.current) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: deliveryAddress }, (results, status) => {
        if (status !== 'OK' || !results[0] || !mapRef.current) return;

        const destPos = results[0].geometry.location;
        destinationMarkerRef.current = new window.google.maps.Marker({
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

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          { origin: driverPos, destination: destPos, travelMode: window.google.maps.TravelMode.DRIVING },
          (result, routeStatus) => {
            if (routeStatus === 'OK' && directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(result);
            }
          }
        );

        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(driverPos);
        bounds.extend(destPos);
        mapRef.current.fitBounds(bounds, { padding: 64 });
      });
    } else if (destinationMarkerRef.current) {
      // Driver moved — refresh route to existing destination
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: driverPos,
          destination: destinationMarkerRef.current.getPosition(),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, routeStatus) => {
          if (routeStatus === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          }
        }
      );
      mapRef.current.panTo(driverPos);
    } else {
      mapRef.current.panTo(driverPos);
    }
  }, [driverLocation, deliveryAddress, orderStatus, mapReady]);

  const handleRequestLocation = () => {
    onRequestLocation?.();
    setLocationRequestCount(prev => prev + 1);
    toast.info('Requesting driver location update...');
  };

  if (orderStatus !== 'on_the_way') return null;

  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="w-4 h-4 text-green-600 animate-pulse" />
          <span className="text-xs font-medium text-green-600">Driver is on the way</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-green-300 text-green-700"
          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(deliveryAddress || '')}`, '_blank')}
        >
          <Navigation className="w-3 h-3 mr-2" /> Open in Google Maps
        </Button>
      </div>
    );
  }

  if (!driverLocation?.lat || !driverLocation?.lng) {
    return (
      <div className="mt-3 h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center p-4 border">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Waiting for driver location...</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Driver will share location shortly'}
          </p>
          {showFallback && (
            <div className="mt-3 space-y-2 w-full">
              <p className="text-[10px] text-orange-500">Driver location taking longer than expected</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-blue-300 text-blue-600"
                  onClick={() => {
                    if (deliveryAddress) window.open(`https://maps.google.com/?q=${encodeURIComponent(deliveryAddress)}`, '_blank');
                  }}
                >
                  <Navigation className="w-3 h-3 mr-1" /> Open Delivery Address
                </Button>
                {/* FIX #6: was variant="default" with Tailwind classes that shadcn
                    was overriding, causing white/low-contrast text. Now uses
                    inline style to guarantee visible white text on green bg. */}
                <button
                  onClick={handleRequestLocation}
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 hover:opacity-90 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Request Location Update
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {locationRequestCount > 0 ? `Location requested ${locationRequestCount} time(s)` : 'Click to request location'}
              </p>
              {!online && (
                <p className="text-[10px] text-red-500 mt-1">
                  <WifiOff className="w-3 h-3 inline mr-1" /> Not connected to server. Please check your connection.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-green-600 animate-pulse" />
          <span className="text-xs font-medium text-green-600">Live Driver Location</span>
        </div>
        <div className="flex items-center gap-2">
          {online && <Wifi className="w-3 h-3 text-green-500" />}
          <span className="text-[10px] text-gray-400">Powered by Google Maps</span>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-48 rounded-lg overflow-hidden border shadow-sm" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500">
        {restaurantAddress && (
          <span className="flex items-center gap-1"><span>🍽️</span> Pickup</span>
        )}
        <span className="flex items-center gap-1"><span>🚚</span> Driver (live)</span>
        <span className="flex items-center gap-1"><span>📍</span> Your address</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-blue-500 ml-auto"
          onClick={handleRequestLocation}
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('CustomerOrders Error:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600 mb-4">{this.state.error?.message || 'Failed to load orders'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-red-600 text-white">Refresh Page</Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">Go Home</Button>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ── Support Modal ────────────────────────────────────────────────────────────
function SupportModal({ isOpen, onClose, user }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('complaint');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Please enter a subject'); return; }
    if (!message.trim()) { toast.error('Please enter your message'); return; }
    setSubmitting(true);
    try {
      await api.post('/support/create-ticket', { 
        customer_id: user?.id, 
        customer_name: user?.name || user?.full_name, 
        customer_email: user?.email, 
        subject, 
        description: message, 
        issue_type: type, 
        order_id: null 
      });
      toast.success('Support ticket created! We will respond within 24 hours.');
      onClose(); 
      setSubject(''); 
      setMessage(''); 
      setType('complaint');
    } catch { 
      toast.error('Failed to create support ticket. Please try again.'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headset className="w-5 h-5 text-green-600" /> Customer Support
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">How can we help you?</p>
            <p className="text-xs">Our support team typically responds within 24 hours.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'complaint', label: '📢 Complaint' }, 
                { value: 'inquiry', label: '❓ Inquiry' }, 
                { value: 'support', label: '🛠️ Support' }, 
                { value: 'feedback', label: '💡 Feedback' }
              ].map((o) => (
                <button 
                  key={o.value} 
                  onClick={() => setType(o.value)} 
                  className={`p-2 rounded-lg border text-sm transition ${
                    type === o.value ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Input 
              placeholder="Brief summary of your issue" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              maxLength={100} 
            />
            <p className="text-xs text-gray-400 mt-1">{subject.length}/100</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea 
              placeholder="Please provide details about your issue or question..." 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              rows={5} 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !subject || !message} 
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} 
              Submit Ticket
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              Or email us at: <a href="mailto:support@lloydsdelivery.com" className="text-green-600">support@lloydsdelivery.com</a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Driver Info Card ─────────────────────────────────────────────────────────
function DriverInfoCard({ driver, isPackage }) {
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
              {isPackage ? 'Your Courier' : 'Your Driver'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {driver.phone && (
              <>
                <a href={`tel:${driver.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a 
                  href={`https://wa.me/${formatWhatsAppNumber(driver.phone)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
        {driver.vehicle_type && (
          <div className="text-right">
            {driver.vehicle_type === 'car' ? 
              <Car className="w-5 h-5 text-blue-500" /> : 
              <Bike className="w-5 h-5 text-green-600" />
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cancellation Modal ───────────────────────────────────────────────────────
function CancellationModal({ isOpen, onClose, onConfirm, orderId, orderType }) {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reasons = [
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'long_delivery', label: 'Delivery time too long' },
    { value: 'wrong_address', label: 'Wrong delivery address' },
    { value: 'found_cheaper', label: 'Found a cheaper option' },
    { value: 'payment_issue', label: 'Payment issue' },
    { value: 'other', label: 'Other' },
  ];
  
  const handleConfirm = async () => {
    if (!reason) { 
      toast.error('Please select a reason for cancellation'); 
      return; 
    }
    const finalReason = reason === 'other' ? otherReason : reasons.find(r => r.value === reason)?.label;
    if (reason === 'other' && !otherReason.trim()) { 
      toast.error('Please provide a reason'); 
      return; 
    }
    setSubmitting(true);
    try { 
      await onConfirm(orderId, finalReason); 
      onClose(); 
    } catch (err) { 
      console.error('Cancellation error:', err); 
    } finally { 
      setSubmitting(false); 
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" /> 
            Cancel {orderType === 'package' ? 'Delivery' : 'Order'} #{orderId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Please tell us why you're cancelling:</label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input 
                    type="radio" 
                    name="cancellationReason" 
                    value={r.value} 
                    checked={reason === r.value} 
                    onChange={(e) => setReason(e.target.value)} 
                    className="w-4 h-4 text-red-500" 
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          {reason === 'other' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Please specify:</label>
              <Textarea 
                placeholder="Tell us why you're cancelling..." 
                value={otherReason} 
                onChange={(e) => setOtherReason(e.target.value)} 
                rows={3} 
                className="mt-1" 
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleConfirm} 
              disabled={submitting} 
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} 
              Confirm Cancellation
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Go Back</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Driver Rating Modal ──────────────────────────────────────────────────────
function DriverRatingModal({ isOpen, onClose, onSubmitted, order, driver, userId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (rating === 0) { 
      toast.error('Please select a rating'); 
      return; 
    }
    setSubmitting(true);
    try {
      await api.post('/orders/reviews/create', { 
        order_id: order?.id, 
        driver_id: driver?.id, 
        customer_id: order?.customer_id || userId, 
        rating, 
        comment, 
        type: 'driver' 
      });
      toast.success('Thank you for rating your driver!'); 
      onSubmitted(); 
      onClose();
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to submit rating'); 
    } finally { 
      setSubmitting(false); 
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Rate Your Driver
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
              {driver?.name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div>
              <p className="font-semibold">{driver?.name || 'Driver'}</p>
              <p className="text-xs text-gray-500">Your delivery driver</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">How was your delivery experience?</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  type="button" 
                  onClick={() => setRating(star)} 
                  onMouseEnter={() => setHoverRating(star)} 
                  onMouseLeave={() => setHoverRating(0)} 
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    } transition-colors`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent!'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Leave a comment (optional)</label>
            <Textarea 
              placeholder="Share your experience with this driver..." 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              rows={3} 
              className="mt-1" 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || rating === 0} 
              className="flex-1 bg-yellow-500 text-white hover:bg-yellow-600"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} 
              Submit Rating
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Active Order Card ────────────────────────────────────────────────────────
function ActiveOrderCard({ order, onCancel, onReorder, onReportIssue, driverLocation, onRequestLocation }) {
  const [expanded, setExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const currentStep = getCurrentStep(order);
  const steps = getStatusSteps(order);
  const isPackage = order.delivery_type && order.delivery_type !== 'food';
  const isRejected = order.status === 'rejected';
  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
  const canCancel = (order.status === 'pending' || order.status === 'confirmed' || order.status === 'pending_approval') && !isRejected;
  const showMap = order.status === 'on_the_way';
  const needsPayment = isPackage && order.payment_status === 'pending_payment' && order.status === 'pending_driver';

  const getEstimatedTime = () => {
    if (isRejected) return 'Request rejected';
    if (isPackage) {
      if (order.status === 'assigned') return 'Driver assigned to pickup';
      if (order.status === 'picked_up') return 'Package picked up, en route';
      if (order.status === 'on_the_way') return 'Arriving soon';
      return 'Waiting for driver assignment';
    }
    if (order.status === 'on_the_way') return 'Arriving soon';
    if (order.status === 'confirmed') return 'Preparing (15-25 min)';
    if (order.status === 'preparing') return 'Almost ready (10-15 min)';
    return 'Estimated 25-35 min';
  };

  const getStatusMessage = () => {
    if (isRejected) return '❌ This delivery request has been rejected by admin.';
    if (isPackage) {
      if (order.status === 'pending_approval') return '⏳ Awaiting admin approval';
      if (order.status === 'pending_driver' && order.payment_status === 'pending_payment') return '✅ Approved! Please complete payment to continue';
      if (order.status === 'pending_driver') return '🔍 Looking for a driver';
      if (order.status === 'assigned') return '✅ Driver assigned — show them the code below when they arrive';
      if (order.status === 'picked_up') return '📦 Package picked up';
      if (order.status === 'on_the_way') return '🚚 Package en route';
      if (order.status === 'delivered') return '✅ Package delivered';
      return '';
    }
    if (order.status === 'confirmed') return '⏱️ Restaurant is preparing your order';
    if (order.status === 'ready_for_pickup') return '🍔 Order ready! Driver assigned';
    if (order.status === 'picked_up') return '🚚 Driver has picked up your order';
    return '';
  };

  const handleDirectPayment = async () => {
    try {
      toast.loading('Processing payment...');
      const response = await api.put(`/orders/${order.id}/payment`, { 
        payment_status: 'paid', 
        payment_transaction_id: 'direct_' + Date.now() 
      });
      toast.dismiss();
      if (response.status === 200) { 
        toast.success('Payment successful! Driver will be notified shortly.'); 
        setTimeout(() => window.location.reload(), 1500); 
      } else throw new Error('Payment failed');
    } catch { 
      toast.dismiss(); 
      toast.error('Payment failed. Please try again.'); 
    }
  };

  const handleYocoPayment = async () => {
    try {
      toast.loading('Preparing payment...');
      const response = await api.post('/orders/checkout', { 
        amount: order.total, 
        orderId: order.id 
      });
      toast.dismiss();
      if (response.data.redirectUrl) window.location.href = response.data.redirectUrl;
      else throw new Error('No redirect URL');
    } catch { 
      toast.dismiss(); 
      toast.error('Failed to initiate payment. Please try demo payment.'); 
    }
  };

  return (
    <>
      <Card className={`overflow-hidden border-2 ${isRejected ? 'border-red-500/50' : 'border-green-600/20'} shadow-md`}>
        <div className={`${
          isRejected ? 'bg-gradient-to-r from-red-600 to-red-500' : 
          isPackage ? 'bg-gradient-to-r from-purple-600 to-purple-500' : 
          'bg-gradient-to-r from-green-600 to-green-600/80'
        } px-3 sm:px-4 py-2 flex items-center justify-between`}>
          <div className="flex items-center gap-1 sm:gap-2">
            {isRejected ? 
              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" /> : 
              isPackage ? 
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" /> : 
              <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" />
            }
            <span className="text-white text-xs sm:text-sm font-semibold">
              {isRejected ? 'Request Rejected' : isPackage ? 'Package Delivery' : 'Live Order'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-3 h-3 text-white" />
            <span className="text-white/80 text-[10px] sm:text-xs">{getEstimatedTime()}</span>
          </div>
        </div>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {!isRejected && (
            <div className="overflow-x-auto pb-1">
              <div className="flex justify-between min-w-[320px] sm:min-w-0">
                {steps.map((step) => (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    {/* FIX #1: Previously currentStep === step.step (the active step)
                        rendered a CheckCircle icon with white fill on a green bg,
                        which disappeared because the icon itself is also white.
                        Now: completed steps (>) show CheckCircle, the active step (===)
                        shows the step number, future steps (<) show the step number in gray.
                        All three states have explicit, visible contrast. */}
                    <div className={cn(
                      "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold transition-all",
                      currentStep > step.step
                        ? "bg-green-600 text-white"          // completed
                        : currentStep === step.step
                        ? "bg-green-600 text-white ring-2 ring-green-300 ring-offset-1" // active — ring makes it pop
                        : "bg-gray-100 text-gray-400 border border-gray-200"            // future
                    )}>
                      {currentStep > step.step
                        ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        : <span className="text-[10px] sm:text-xs">{step.step}</span>
                      }
                    </div>
                    <span className={cn(
                      "text-[9px] sm:text-xs mt-1 text-center whitespace-nowrap",
                      currentStep >= step.step ? "text-green-600 font-semibold" : "text-gray-400"
                    )}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {getStatusMessage() && (
            <div className={`${
              isRejected ? 'bg-red-50' : 
              isPackage ? 'bg-purple-50' : 
              'bg-blue-50'
            } p-2 rounded-lg text-center`}>
              <p className={`text-[10px] sm:text-xs ${
                isRejected ? 'text-red-700' : 
                isPackage ? 'text-purple-700' : 
                'text-blue-700'
              }`}>{getStatusMessage()}</p>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-100 border-l-4 border-red-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">Delivery Request Rejected</p>
                  {order.admin_rejection_reason ? (
                    <>
                      <p className="text-sm text-red-700 mb-2 font-medium">{order.admin_rejection_reason}</p>
                      <p className="text-xs text-red-600">Please contact support if you have any questions.</p>
                    </>
                  ) : (
                    <p className="text-sm text-red-700">Your package delivery request has been rejected. Please contact support.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isRejected && (order.driver_id || order.driver_name) && (
            <DriverInfoCard 
              driver={{ 
                id: order.driver_id, 
                name: order.driver_name, 
                phone: order.driver_phone, 
                vehicle_type: order.driver_vehicle_type 
              }} 
              isPackage={isPackage} 
            />
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Total</p>
              <p className="font-bold text-green-600 text-sm sm:text-lg">R{Number(order.total).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">{isPackage ? 'Package ID' : 'Items'}</p>
              <p className="font-semibold text-xs sm:text-sm">{isPackage ? `#${order.id}` : `${items.length} item(s)`}</p>
            </div>
          </div>

          {isPackage && !isRejected && (
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1">
                <Package className="w-3 h-3" /> Package Details
              </p>
              {order.pickup_address && (
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500">Pickup Address</p>
                    <p className="text-xs font-medium">{order.pickup_address}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs ml-auto shrink-0" 
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.pickup_address)}`, '_blank')}
                  >
                    <Navigation className="w-2.5 h-2.5 mr-1" /> Navigate
                  </Button>
                </div>
              )}
              {order.recipient_name && (
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-500" />
                    <span className="text-xs">Recipient: {order.recipient_name}</span>
                  </div>
                  {order.recipient_phone && (
                    <a href={`tel:${order.recipient_phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Phone className="w-3 h-3" /> Call Recipient
                    </a>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs mt-2">
                {order.package_weight && <span>⚖️ {order.package_weight}kg</span>}
                {order.package_dimensions && <span>📏 {order.package_dimensions}</span>}
                {order.requires_signature && <span className="text-blue-600">📝 Signature Required</span>}
                {order.is_fragile && <span className="text-orange-600">⚠️ Fragile Item</span>}
              </div>
              {order.package_description && (
                <p className="text-xs text-gray-600 mt-2 pt-1 border-t border-purple-200">📦 {order.package_description}</p>
              )}
            </div>
          )}

          {/* Verification Code — shows when driver is assigned and coming to collect */}
          {isPackage && order.verification_code && order.status === 'assigned' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800">Collection Verification Code</span>
              </div>
              <p className="text-3xl font-bold text-yellow-700 tracking-wider text-center font-mono">
                {order.verification_code}
              </p>
              <p className="text-xs text-yellow-600 mt-2 text-center">
                Show this code to your driver when they arrive to collect the package
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50" 
                onClick={() => { 
                  navigator.clipboard.writeText(order.verification_code); 
                  toast.success('Code copied to clipboard'); 
                }}
              >
                Copy Code
              </Button>
            </div>
          )}

          {/* Pickup/Restaurant location — food orders, useful to show even before driver moves */}
          {!isPackage && (order.restaurant_address || order.restaurant_name) && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2 sm:p-3">
              <Store className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500">Pickup from</p>
                <span className="text-xs sm:text-sm break-words">
                  {order.restaurant_name}{order.restaurant_address ? ` — ${order.restaurant_address}` : ''}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2 sm:p-3">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] text-gray-500">Delivery Address</p>
              <span className="text-xs sm:text-sm break-words">{order.delivery_address || 'No address provided'}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs shrink-0" 
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`, '_blank')}
            >
              <Navigation className="w-3 h-3 mr-1" /> Navigate
            </Button>
          </div>

          {/* Google Maps live tracking — food orders on_the_way: driver moving from restaurant to customer */}
          {showMap && !isPackage && !isRejected && (
            <LiveMap 
              driverLocation={driverLocation} 
              deliveryAddress={order.delivery_address}
              restaurantAddress={order.restaurant_address}
              restaurantName={order.restaurant_name}
              orderStatus={order.status}
              orderId={order.id}
              onRequestLocation={onRequestLocation}
            />
          )}

          {!isRejected && isPackage && order.status === 'on_the_way' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full border-purple-300 text-purple-600 hover:bg-purple-50" 
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`, '_blank')}
            >
              <Navigation className="w-3 h-3 mr-1" /> Track Package
            </Button>
          )}

          {!isRejected && needsPayment && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 bg-yellow-500 text-white hover:bg-yellow-600" 
                onClick={handleDirectPayment}
              >
                <Lock className="w-3 h-3 mr-1" /> Pay Now • R{Number(order.total).toFixed(2)}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-green-600 text-green-600 hover:bg-green-50" 
                onClick={handleYocoPayment}
              >
                💳 Pay with Card
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {canCancel && order.status !== 'delivered' && !needsPayment && !isRejected && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm h-8 sm:h-9" 
                onClick={() => { 
                  setCancellingOrderId(order.id); 
                  setShowCancelModal(true); 
                }}
              >
                Cancel {isPackage ? 'Delivery' : 'Order'}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9" 
              onClick={() => onReorder(order)}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> {isPackage ? 'Book Again' : 'Order Again'}
            </Button>
            {order.status === 'delivered' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-8 sm:h-9" 
                onClick={() => onReportIssue(order)}
              >
                <AlertCircle className="w-3 h-3 mr-1" /> Report Issue
              </Button>
            )}
          </div>

          {!isPackage && !isRejected && items.length > 0 && (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="flex items-center justify-between w-full text-xs sm:text-sm text-gray-500 hover:text-gray-700"
            >
              <span>View order details</span>
              {expanded ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            </button>
          )}
          {!isPackage && !isRejected && expanded && items.length > 0 && (
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
                <div className="flex justify-between text-xs sm:text-sm text-green-600">
                  <span>Discount</span>
                  <span>-R{Number(order.discount_applied).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <CancellationModal 
        isOpen={showCancelModal} 
        onClose={() => { 
          setShowCancelModal(false); 
          setCancellingOrderId(null); 
        }} 
        onConfirm={onCancel} 
        orderId={cancellingOrderId} 
        orderType={isPackage ? 'package' : 'food'} 
      />
    </>
  );
}

// ── Order History Card ───────────────────────────────────────────────────────
function OrderHistoryCard({ order, onReviewOrder, onReorder, onRateDriver }) {
  const [expanded, setExpanded] = useState(false);
  const isPackage = order.delivery_type && order.delivery_type !== 'food';
  const isRejected = order.status === 'rejected';
  const getStatusColor = (s) => ({ 
    delivered: 'text-green-600 bg-green-50', 
    cancelled: 'text-red-600 bg-red-50', 
    rejected: 'text-red-600 bg-red-100' 
  }[s] || 'text-yellow-600 bg-yellow-50');
  const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
  const hasDriverRating = order.driver_rated !== undefined ? !order.driver_rated : true;

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors py-3 sm:py-4 px-3 sm:px-4" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isPackage ? 'bg-purple-100' : 'bg-primary/10'
            }`}>
              <Package className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isPackage ? 'text-purple-600' : 'text-primary'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {isPackage ? (isRejected ? '❌ Package Delivery (Rejected)' : 'Package Delivery') : (order.restaurant_name || 'Restaurant')}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy') : ''}
                </p>
                {order.delivered_at && <p className="text-[10px] text-green-500">✓ Delivered</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${
              getStatusColor(order.status)
            } whitespace-nowrap`}>
              {order.status === 'rejected' ? 'Rejected' : formatOrderStatus(order.status)}
            </span>
            <span className="font-bold text-green-600 text-xs sm:text-sm whitespace-nowrap">
              R{Number(order.total).toFixed(2)}
            </span>
            {expanded ? 
              <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" /> : 
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
            }
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3 border-t px-3 sm:px-4">
          {isRejected && (
            <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-4 mt-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">Request Rejected</p>
                  {order.admin_rejection_reason ? (
                    <>
                      <p className="text-sm text-red-700 mb-2 font-medium">{order.admin_rejection_reason}</p>
                      <p className="text-xs text-red-600">If you believe this is an error, please contact support.</p>
                    </>
                  ) : (
                    <p className="text-sm text-red-700">Your request was rejected. Please contact support for more information.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {isPackage && (
            <div className="space-y-2 pt-3">
              {order.pickup_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500">Pickup Address</p>
                    <p className="text-xs">{order.pickup_address}</p>
                  </div>
                </div>
              )}
              {order.recipient_name && (
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-xs">Recipient: {order.recipient_name}</span>
                  {order.recipient_phone && (
                    <a href={`tel:${order.recipient_phone}`} className="text-xs text-blue-600">Call</a>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {order.package_weight && <span>⚖️ {order.package_weight}kg</span>}
                {order.requires_signature && <span className="text-blue-600">📝 Signature</span>}
                {order.is_fragile && <span className="text-orange-600">⚠️ Fragile</span>}
              </div>
            </div>
          )}
          {!isPackage && (
            <div className="space-y-1 pt-3">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">{item.quantity}x {item.name}</span>
                  <span>R{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
            <span className="text-gray-500">Delivery fee</span>
            <span>R{Number(order.delivery_fee || 0).toFixed(2)}</span>
          </div>
          {order.discount_applied > 0 && (
            <div className="flex justify-between text-xs sm:text-sm text-green-600">
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
          {order.driver_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
              <Truck className="w-3 h-3" />
              <span>{isPackage ? 'Delivered by courier:' : 'Delivered by driver:'} {order.driver_name}</span>
              {order.driver_phone && (
                <a href={`tel:${order.driver_phone}`} className="text-blue-600 hover:underline ml-auto">
                  <Phone className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-2 flex-wrap">
            {order.status === 'delivered' && !order.reviewed && !isPackage && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-yellow-400 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-9" 
                onClick={() => onReviewOrder(order)}
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Rate Restaurant
              </Button>
            )}
            {order.status === 'delivered' && order.driver_id && hasDriverRating && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-blue-400 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-9" 
                onClick={() => onRateDriver(order, { id: order.driver_id, name: order.driver_name })}
              >
                <Star className="w-3 h-3 mr-1" /> Rate Driver
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-green-600 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9" 
              onClick={() => onReorder(order)}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> {isPackage ? 'Book Again' : 'Order Again'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
function CustomerOrdersComponent() {
  const { socket, online } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();
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
  const [orderTab, setOrderTab] = useState('active');
  const [showRejectionAlert, setShowRejectionAlert] = useState(false);
  const [rejectedOrder, setRejectedOrder] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDriverRatingModal, setShowDriverRatingModal] = useState(false);
  const [selectedDriverForRating, setSelectedDriverForRating] = useState(null);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [locationRequestCount, setLocationRequestCount] = useState(0);

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customerOrders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get(`/orders/customer/${user.id}`);
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        return [];
      } catch { return []; }
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // ── Driver location handling with localStorage cache ──
  useEffect(() => {
    const saved = localStorage.getItem('last_driver_location');
    if (saved && !driverLocation) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setDriverLocation({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch (e) {}
    }
  }, []);

  // ── Function to request driver location ──
  const requestDriverLocation = useCallback(() => {
    if (socket && online) {
      const activeOnTheWay = sortedOrders.find(o => o.status === 'on_the_way');
      if (activeOnTheWay) {
        setLocationRequestCount(prev => prev + 1);
        socket.emit('request-driver-location', { orderId: activeOnTheWay.id });
        toast.info('Requesting driver location update...');
      } else {
        toast.info('No active delivery to track');
      }
    } else {
      toast.error('Not connected to server. Please check your connection.');
    }
  }, [socket, online, sortedOrders]);

  useEffect(() => {
    if (socket && online) {
      socket.on('driver-location-update', (data) => {
        if (data?.lat && data?.lng) {
          setDriverLocation({ lat: data.lat, lng: data.lng });
          localStorage.setItem('last_driver_location', JSON.stringify({ 
            lat: data.lat, 
            lng: data.lng,
            timestamp: Date.now()
          }));
          toast.success('Driver location updated!');
        }
      });

      const activeOnTheWay = sortedOrders.find(o => o.status === 'on_the_way');
      if (activeOnTheWay) {
        socket.emit('request-driver-location', { orderId: activeOnTheWay.id });
        setTimeout(() => {
          socket.emit('request-driver-location', { orderId: activeOnTheWay.id });
        }, 5000);
      }

      socket.on('order-status-update', (data) => {
        if (data.status === 'on_the_way') {
          setTimeout(() => {
            socket.emit('request-driver-location', { orderId: data.orderId });
          }, 1000);
        }
      });

      return () => {
        socket.off('driver-location-update');
        socket.off('order-status-update');
      };
    }
  }, [socket, online, sortedOrders]);

  useEffect(() => {
    if (socket && online) {
      socket.on('order-rejected', (data) => { 
        setRejectedOrder(data); 
        setShowRejectionAlert(true); 
        toast.error(`❌ Your package request #${data.orderId} was rejected. Reason: ${data.reason}`); 
        refetch(); 
      });
      return () => socket.off('order-rejected');
    }
  }, [socket, online, refetch]);

  const fetchUserTickets = async () => { 
    try { 
      const r = await api.get('/support/my-tickets'); 
      setUserTickets(r.data || []); 
    } catch {} 
  };
  
  useEffect(() => { 
    if (showTicketsModal) fetchUserTickets(); 
  }, [showTicketsModal]);

  const handleCancelOrder = async (orderId, reason) => {
    try {
      const response = await fetch(`https://lloyds-delivery.onrender.com/api/orders/cancel/${orderId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ customer_id: user?.id, cancellation_reason: reason }) 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to cancel order');
      toast.success('Order cancelled successfully'); 
      refetch();
    } catch (err) { 
      toast.error(err.message || 'Failed to cancel order'); 
    }
  };

  const handleReorder = (order) => {
    const isPackage = order.delivery_type && order.delivery_type !== 'food';
    if (isPackage) { 
      navigate('/package-delivery'); 
      toast.info('Fill in the package delivery form to book again'); 
      return; 
    }
    const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
    if (window.confirm(`Add items from ${order.restaurant_name} to your cart? This will replace your current cart.`)) {
      items.forEach(item => addToCart(
        { id: item.id || item.menu_item_id, name: item.name, price: item.price, image: item.image_url }, 
        order.restaurant_id, 
        order.restaurant_name
      ));
      toast.success(`${items.length} items added to cart from ${order.restaurant_name}`); 
      navigate('/cart');
    }
  };

  useEffect(() => {
    if (socket && user?.id && online && sortedOrders.length > 0) {
      sortedOrders.forEach(order => socket.emit('join-order', order.id));
      const handleStatusUpdate = (data) => {
        setLiveUpdates(prev => ({ ...prev, [data.orderId]: data.status }));
        if (data.status === 'rejected') { 
          toast.error(`❌ Your package request #${data.orderId} was rejected.`); 
          setShowRejectionAlert(true); 
        } else {
          toast.info(`Order #${data.orderId} updated to ${formatOrderStatus(data.status)}`);
        }
        refetch();
      };
      socket.on('order-status-update', handleStatusUpdate);
      return () => socket.off('order-status-update', handleStatusUpdate);
    }
  }, [socket, user, sortedOrders, online, refetch]);

  const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'pending_approval', 'pending_driver', 'assigned', 'rejected'];
  const activeOrders = sortedOrders.filter(o => activeStatuses.includes(o.status));
  const pastOrders = sortedOrders.filter(o => !activeStatuses.includes(o.status) || o.status === 'cancelled');
  
  useEffect(() => { 
    if (activeOrders.length > 0) markOrdersAsViewed(activeOrders.map(o => o.id)); 
  }, [activeOrders]);

  const filteredPastOrders = pastOrders.filter(o =>
    o.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id?.toString().includes(searchTerm) ||
    (o.delivery_type === 'package' && 'package'.includes(searchTerm.toLowerCase()))
  );
  const displayedPastOrders = filteredPastOrders.slice(0, visibleCount);
  const hasMore = filteredPastOrders.length > visibleCount;

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-xl" />)}
      </div>
    </div>
  );
  
  if (error) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="text-center py-8 sm:py-12 bg-white rounded-xl border">
        <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-300 mx-auto mb-3 sm:mb-4" />
        <p className="text-sm sm:text-base text-gray-500">Failed to load orders</p>
        <button onClick={() => refetch()} className="mt-3 sm:mt-4 text-green-600 hover:underline text-sm">Try again</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} user={user} />

      {showRejectionAlert && rejectedOrder && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Package Request Rejected</p>
              <p className="text-sm text-red-700 mt-1">Order #{rejectedOrder.orderId} was rejected.</p>
              <p className="text-sm font-medium text-red-800 mt-2">Reason:</p>
              <p className="text-sm text-red-700">{rejectedOrder.reason}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3 border-red-300 text-red-600 hover:bg-red-100" 
                onClick={() => setShowRejectionAlert(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">My Orders</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSupportModal(true)} className="text-xs">
            <Headset className="w-3 h-3 mr-1" /> Support
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTicketsModal(true)} className="text-xs">
            <MessageCircle className="w-3 h-3 mr-1" /> My Tickets
          </Button>
          {online && (
            <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              🟢 Live updates active
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Tabs value={orderTab} onValueChange={setOrderTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="text-sm">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">History ({pastOrders.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-xl border">
          <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No orders yet</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Browse restaurants or book a package delivery</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
            <Button onClick={() => navigate('/')} className="bg-green-600 text-white">
              Browse Restaurants
            </Button>
            <Button onClick={() => navigate('/package-delivery')} variant="outline" className="border-purple-500 text-purple-600">
              <Package className="w-4 h-4 mr-2" /> Book Package Delivery
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {orderTab === 'active' && (
            activeOrders.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {activeOrders.map(order => (
                  <ActiveOrderCard 
                    key={order.id} 
                    order={liveUpdates[order.id] ? { ...order, status: liveUpdates[order.id] } : order} 
                    onCancel={handleCancelOrder} 
                    onReorder={handleReorder} 
                    onReportIssue={(o) => { 
                      setSelectedOrderForIssue(o); 
                      setShowIssueModal(true); 
                    }} 
                    driverLocation={driverLocation}
                    onRequestLocation={requestDriverLocation}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-gray-500">No active orders</p>
                <p className="text-xs text-gray-400 mt-1">Your active orders will appear here</p>
                <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                  Browse Restaurants
                </Button>
              </div>
            )
          )}

          {orderTab === 'history' && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: 'All Orders', value: '' }, 
                  { label: '📦 Packages', value: 'package' }, 
                  { label: '🍔 Food', value: 'food' }
                ].map((f) => (
                  <Badge 
                    key={f.label} 
                    variant={searchTerm === f.value ? 'default' : 'outline'} 
                    className={`cursor-pointer text-xs font-medium ${
                      searchTerm === f.value 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`} 
                    onClick={() => setSearchTerm(f.value)}
                  >
                    {f.label}
                  </Badge>
                ))}
              </div>
              <div className="relative w-full mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                <Input 
                  placeholder="Search by restaurant, package, or order #..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-8 h-8 text-sm" 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
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
                        onReviewOrder={(o) => { 
                          setSelectedOrder(o); 
                          setShowReviewModal(true); 
                        }} 
                        onReorder={handleReorder} 
                        onRateDriver={(o, d) => { 
                          setSelectedOrderForRating(o); 
                          setSelectedDriverForRating(d); 
                          setShowDriverRatingModal(true); 
                        }} 
                      />
                    ))}
                    {hasMore && (
                      <Button 
                        onClick={() => setVisibleCount(p => p + 10)} 
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
      
      <DriverRatingModal 
        isOpen={showDriverRatingModal} 
        onClose={() => { 
          setShowDriverRatingModal(false); 
          setSelectedDriverForRating(null); 
          setSelectedOrderForRating(null); 
        }} 
        onSubmitted={() => refetch()} 
        order={selectedOrderForRating} 
        driver={selectedDriverForRating} 
        userId={user?.id} 
      />
      
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
            toast.info("Support ticket created. We'll respond within 24 hours."); 
          }} 
        />
      )}

      <Dialog open={showTicketsModal} onOpenChange={setShowTicketsModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>My Support Tickets</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {userTickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No support tickets</p>
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
                      <Badge className={statusColors[ticket.status]}>{ticket.status?.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{ticket.description}</p>
                    {ticket.admin_response && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-green-600 font-medium">📨 Response received</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">{format(new Date(ticket.created_at), 'dd MMM yyyy')}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <Button onClick={() => setShowTicketsModal(false)} variant="outline" className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>

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

export default function CustomerOrders() {
  return <ErrorBoundary><CustomerOrdersComponent /></ErrorBoundary>;
}