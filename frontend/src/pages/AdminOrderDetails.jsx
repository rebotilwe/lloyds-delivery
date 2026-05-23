import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MapPin, 
  Package, 
  User, 
  Store, 
  Clock, 
  CreditCard, 
  Phone, 
  Mail, 
  Calendar,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (value) => {
  const num = Number(value);
  return isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

const OrderStatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    ready_for_pickup: 'bg-indigo-100 text-indigo-800',
    picked_up: 'bg-pink-100 text-pink-800',
    on_the_way: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  
  const displayStatus = status === 'ready_for_pickup' ? 'Ready for Pickup' : 
                       status?.replace(/_/g, ' ').toUpperCase() || 'PENDING';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {displayStatus}
    </span>
  );
};

// Status update options with proper labels
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'on_the_way', label: 'On the Way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      console.log("Fetching order ID:", id);
      const response = await api.get(`/orders/${id}`);
      console.log("API Response:", response);
      
      if (response.data && response.data.id) {
        setOrder(response.data);
        setError(null);
      } else if (response.id) {
        setOrder(response);
        setError(null);
      } else {
        throw new Error('Order not found');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || 'Failed to load order');
      toast.error('Could not load order details');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!window.confirm(`Change order status to ${statusOptions.find(s => s.value === newStatus)?.label}?`)) {
      return;
    }
    
    setUpdating(true);
    try {
      await api.put(`/orders/status/${id}`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrder();
    } catch (err) {
      console.error('Status update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Calculate order summary
  const subtotal = order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const deliveryFee = Number(order?.delivery_fee) || 0;
  const discount = Number(order?.discount_applied) || 0;
  const total = Number(order?.total) || 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-semibold mb-2">Order Not Found</p>
          <p className="text-gray-500 text-sm mb-4">Order #{id} could not be found or has been removed.</p>
          <button 
            onClick={() => navigate('/admin/orders')} 
            className="bg-green text-white px-4 py-2 rounded-lg hover:bg-green/90 transition"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/orders')} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-navy">Order #{order.id}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : 'Date unknown'}
            </p>
          </div>
        </div>
        <button 
          onClick={fetchOrder} 
          className="flex items-center justify-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Order Items (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Order Items Section */}
          <div className="bg-white rounded-xl border p-4 sm:p-6">
            <h2 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green" />
              Order Items
            </h2>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                <>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-gray-600 text-sm">x{item.quantity}</span>
                          <p className="font-medium text-sm sm:text-base">{item.name || `Item ${item.menu_item_id}`}</p>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                      <p className="font-semibold text-sm sm:text-base ml-4">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                  
                  {/* Order Summary */}
                  <div className="pt-3 mt-2 border-t">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span>{formatCurrency(deliveryFee)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green">
                          <span>Discount Applied</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t">
                        <span>Total</span>
                        <span className="text-green">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">No items found for this order</p>
              )}
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="bg-white rounded-xl border p-4 sm:p-6">
            <h2 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green" />
              Delivery Address
            </h2>
            <p className="text-gray-700 text-sm sm:text-base break-words">{order.delivery_address || 'No address provided'}</p>
            {order.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500 mb-1">Delivery Notes</p>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Info Cards (1/3 width on desktop) */}
        <div className="space-y-4">
          {/* Status Update Card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-3">Update Status</h2>
            <select
              value={order.status || 'pending'}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {updating && (
              <p className="text-xs text-gray-400 mt-2 text-center">Updating...</p>
            )}
          </div>

          {/* Payment Info Card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green" />
              Payment Info
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.payment_status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
              {order.payment_transaction_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="text-xs font-mono break-all text-right">{order.payment_transaction_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span>Card</span>
              </div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-green" />
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium break-words">{order.customer_name || 'Guest'}</p>
              {order.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline text-xs break-all">
                    {order.customer_email}
                  </a>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline text-xs">
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Restaurant Info Card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-green" />
              Restaurant
            </h2>
            <p className="font-medium text-sm break-words">{order.restaurant_name || 'Unknown Restaurant'}</p>
            {order.restaurant_id && (
              <p className="text-xs text-gray-400 mt-1">ID: {order.restaurant_id}</p>
            )}
          </div>

          {/* Driver Info Card (if assigned) */}
          {order.driver_id && (
            <div className="bg-white rounded-xl border p-4 sm:p-5">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-green" />
                Driver
              </h2>
              <p className="font-medium text-sm">Driver ID: {order.driver_id}</p>
              {order.driver_earning > 0 && (
                <p className="text-xs text-green-600 mt-1">Earnings: {formatCurrency(order.driver_earning)}</p>
              )}
            </div>
          )}

          {/* Timeline Card */}
          <div className="bg-white rounded-xl border p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green" />
              Timeline
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{order.created_at ? format(new Date(order.created_at), 'dd MMM, HH:mm') : '-'}</span>
              </div>
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivered</span>
                  <span>{format(new Date(order.delivered_at), 'dd MMM, HH:mm')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Promo Code Section (if applicable) */}
      {order.promo_code && (
        <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green" />
              <span className="text-sm font-medium text-green-700">Promo Code Applied</span>
            </div>
            <div>
              <span className="font-mono font-bold text-green-800">{order.promo_code}</span>
              {order.discount_applied > 0 && (
                <span className="text-xs text-green-600 ml-2">(Saved {formatCurrency(order.discount_applied)})</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}