import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Package, User, Store, Clock } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (value) => {
  const num = Number(value);
  return isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

const OrderStatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    ready: 'bg-purple-100 text-purple-800',
    picked_up: 'bg-pink-100 text-pink-800',
    on_the_way: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
    </span>
  );
};

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

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
    setUpdating(true);
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrder();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 font-semibold mb-2">Order Not Found</p>
          <p className="text-gray-500 text-sm mb-4">Order #{id} could not be found.</p>
          <button 
            onClick={() => navigate('/admin/orders')} 
            className="bg-green text-white px-4 py-2 rounded-lg hover:bg-green/90"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/admin/orders')} 
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-navy">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green" />
              Order Items
            </h2>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{item.quantity}x {item.name || `Item ${item.menu_item_id}`}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No items found</p>
              )}
              <div className="pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span className="text-green">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-2">Delivery Address</h2>
            <p className="text-gray-700">{order.delivery_address || 'No address provided'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-3">Order Info</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Date:</span> {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : '-'}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-3">Customer</h2>
            <p className="font-medium">{order.customer_name || 'Guest'}</p>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-3">Restaurant</h2>
            <p>{order.restaurant_name || 'Unknown'}</p>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg mb-3">Update Status</h2>
            <select
              value={order.status || 'pending'}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="w-full p-2 border rounded-lg"
            >
              {['pending', 'confirmed', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}