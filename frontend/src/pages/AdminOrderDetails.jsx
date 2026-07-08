import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { 
  ArrowLeft, Package, User, MapPin, Clock, DollarSign, 
  Truck, Store, CheckCircle, XCircle, AlertCircle, Phone,
  FileText, Navigation, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors = {
  pending:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed:        'bg-blue-100 text-blue-800 border-blue-200',
  preparing:        'bg-purple-100 text-purple-800 border-purple-200',
  ready_for_pickup: 'bg-green-100 text-green-800 border-green-200',
  picked_up:        'bg-indigo-100 text-indigo-800 border-indigo-200',
  on_the_way:       'bg-orange-100 text-orange-800 border-orange-200',
  delivered:        'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled:        'bg-red-100 text-red-800 border-red-200',
  pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending_driver:   'bg-blue-100 text-blue-800 border-blue-200',
  assigned:         'bg-purple-100 text-purple-800 border-purple-200',
};

const paymentColors = {
  paid:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed:  'bg-red-100 text-red-800 border-red-200',
};

const formatStatus = (s) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatCurrency = (v) => {
  const n = parseFloat(v);
  return !isNaN(n) ? `R${n.toFixed(2)}` : 'R0.00';
};

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data ?? res);
    } catch (err) {
      console.error('Error fetching order:', err);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/orders/status/${id}`, { status: newStatus });
      toast.success(`Order status updated to ${formatStatus(newStatus)}`);
      fetchOrder();
    } catch (err) {
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const openMap = (address) => {
    if (!address) return;
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );

  if (!order) return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-center">
      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Order not found</p>
      <Button onClick={() => navigate('/admin/orders')} variant="outline" className="mt-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
      </Button>
    </div>
  );

  const isPackage = order.delivery_type && order.delivery_type !== 'food';
  const items = Array.isArray(order.items) ? order.items : [];

  // Available next statuses depending on current status
  const statusActions = {
    pending:          [{ label: 'Confirm Order',      value: 'confirmed'        }],
    confirmed:        [{ label: 'Mark Preparing',     value: 'preparing'        }],
    preparing:        [{ label: 'Mark Ready',         value: 'ready_for_pickup' }],
    ready_for_pickup: [{ label: 'Mark Picked Up',     value: 'picked_up'        }],
    picked_up:        [{ label: 'Mark On The Way',    value: 'on_the_way'       }],
    on_the_way:       [{ label: 'Mark Delivered',     value: 'delivered'        }],
    pending_approval: [
      { label: 'Approve Package', value: 'pending_driver', color: 'bg-green-600 text-white hover:bg-green-700' },
      { label: 'Reject',          value: 'cancelled',      color: 'bg-red-600 text-white hover:bg-red-700'   },
    ],
    pending_driver:   [{ label: 'Mark Assigned',      value: 'assigned'         }],
    assigned:         [{ label: 'Mark Picked Up',     value: 'picked_up'        }],
  };

  const actions = statusActions[order.status] || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1" /> Orders
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-xs text-gray-400">
              {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy • HH:mm') : '—'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrder} disabled={loading} className="rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status + Payment badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge className={`border font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
          {formatStatus(order.status)}
        </Badge>
        <Badge className={`border font-medium ${paymentColors[order.payment_status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
          {formatStatus(order.payment_status)} — {formatCurrency(order.total)}
        </Badge>
        {isPackage && (
          <Badge className="border bg-purple-100 text-purple-800 border-purple-200 font-medium">
            {formatStatus(order.delivery_type)} Delivery
          </Badge>
        )}
      </div>

      {/* Status action buttons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {actions.map(action => (
            <Button
              key={action.value}
              onClick={() => updateStatus(action.value)}
              disabled={updating}
              className={`rounded-xl ${action.color || 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {updating ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
              {action.label}
            </Button>
          ))}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button
              onClick={() => updateStatus('cancelled')}
              disabled={updating}
              variant="outline"
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Order
            </Button>
          )}
        </div>
      )}

      {/* ── FIX #3: Content now in scrollable cards, nothing cut off ── */}
      {/* ── FIX #4: Single close control — just the back button at the top ── */}
      <div className="space-y-4">

        {/* Customer Information */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Customer Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="font-medium text-gray-800">{order.customer_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="font-medium text-gray-800">{order.customer_email || '—'}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  <a href={`tel:${order.customer_phone}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restaurant / Pickup Information */}
        {!isPackage && (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <Store className="w-4 h-4 text-orange-600" />
                </div>
                <h2 className="font-semibold text-gray-800">Restaurant Information</h2>
              </div>
              <div className="text-sm">
                <p className="text-xs text-gray-400 mb-0.5">Restaurant</p>
                <p className="font-medium text-gray-800">{order.restaurant_name || '—'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Package Details */}
        {isPackage && (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Package className="w-4 h-4 text-purple-600" />
                </div>
                <h2 className="font-semibold text-gray-800">Package Details</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {order.pickup_address && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Pickup Address</p>
                    <div className="flex items-start gap-2">
                      <p className="font-medium text-gray-800 flex-1">{order.pickup_address}</p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-500" onClick={() => openMap(order.pickup_address)}>
                        <Navigation className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {order.recipient_name && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Recipient</p>
                    <p className="font-medium text-gray-800">{order.recipient_name}</p>
                  </div>
                )}
                {order.recipient_phone && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Recipient Phone</p>
                    <a href={`tel:${order.recipient_phone}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {order.recipient_phone}
                    </a>
                  </div>
                )}
                {order.package_weight && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Weight</p>
                    <p className="font-medium text-gray-800">{order.package_weight}kg</p>
                  </div>
                )}
                {order.package_dimensions && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dimensions</p>
                    <p className="font-medium text-gray-800">{order.package_dimensions}</p>
                  </div>
                )}
                {order.package_description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Description</p>
                    <p className="font-medium text-gray-800">{order.package_description}</p>
                  </div>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {order.requires_signature && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">📝 Signature Required</Badge>
                  )}
                  {order.is_fragile && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">⚠️ Fragile</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Address */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Delivery Address</h2>
            </div>
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-700 flex-1">{order.delivery_address || '—'}</p>
              {order.delivery_address && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-500 shrink-0" onClick={() => openMap(order.delivery_address)}>
                  <Navigation className="w-3 h-3 mr-1" /> Map
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        {(order.driver_name || order.driver_id) && (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Truck className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="font-semibold text-gray-800">Driver Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Driver</p>
                  <p className="font-medium text-gray-800">{order.driver_name || `Driver #${order.driver_id}`}</p>
                </div>
                {order.driver_phone && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <a href={`tel:${order.driver_phone}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {order.driver_phone}
                    </a>
                  </div>
                )}
                {order.driver_earning && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Driver Earning</p>
                    <p className="font-medium text-green-600">{formatCurrency(order.driver_earning)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items — food only */}
        {!isPackage && items.length > 0 && (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-yellow-100 rounded-lg">
                  <FileText className="w-4 h-4 text-yellow-600" />
                </div>
                <h2 className="font-semibold text-gray-800">Order Items</h2>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{item.quantity}× {item.name}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Financial Summary</h2>
            </div>
            <div className="space-y-2 text-sm">
              {order.original_total && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(order.original_total)}</span>
                </div>
              )}
              {order.delivery_fee && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              {order.discount_applied > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.promo_code && `(${order.promo_code})`}</span>
                  <span>-{formatCurrency(order.discount_applied)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(order.total)}</span>
              </div>
              {order.platform_earning && (
                <div className="flex justify-between text-purple-600 text-xs">
                  <span>Platform Earning</span>
                  <span>{formatCurrency(order.platform_earning)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}