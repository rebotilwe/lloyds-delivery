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
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedPrepTime, setEstimatedPrepTime] = useState('');
  const [loading, setLoading] = useState(true);
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
          action: {
            label: 'View',
            onClick: () => {},
          },
        });
      });
      
      return () => {
        socket.off('new-order');
      };
    }
  }, [socket, online]);

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

  const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    try {
      await api.put(`/vendor/orders/${orderId}/status`, {
        status,
        ...additionalData,
      });
      toast.success(`Order ${status === 'rejected' ? 'rejected' : 'updated'} successfully`);
      fetchOrders();
      setShowDetails(false);
      setRejectionReason(''); // Clear rejection reason after submit
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

  const pendingOrders = (orders || []).filter(o => o?.status === 'pending');
  const activeOrders = (orders || []).filter(o => ['confirmed', 'preparing'].includes(o?.status));
  const completedOrders = (orders || []).filter(o => ['ready_for_pickup', 'picked_up', 'on_the_way', 'delivered'].includes(o?.status));

  const OrderCard = ({ order }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between sm:justify-start gap-3 mb-2">
              <p className="font-semibold">Order #{order.id}</p>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-sm text-gray-600">{order.customer_name || 'Guest'}</p>
            <p className="text-xs text-gray-400 mt-1">
              {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, h:mm a') : '-'}
            </p>
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
            {order.status === 'pending' && (
              <div className="flex gap-2 mt-2">
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedOrder(order);
                setShowDetails(true);
              }}
              className="mt-2"
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-gray-500">Manage incoming orders from customers</p>
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
                No completed orders
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Order Details Modal - FIXED with Rejection Reason Input */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Customer Information</h3>
                <p className="text-sm">{selectedOrder.customer_name || 'Guest'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{selectedOrder.customer_email}</span>
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{selectedOrder.customer_phone}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Delivery Address
                </h3>
                <p className="text-sm">{selectedOrder.delivery_address || 'No address'}</p>
              </div>

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
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span className="text-green">R{Number(selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Order Actions - Accept or Reject */}
              {selectedOrder.status === 'pending' && (
                <div className="space-y-4">
                  {/* For Accept: Estimated Prep Time */}
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

                  {/* For Reject: Rejection Reason */}
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

              {/* Show Rejection Reason if order was rejected */}
              {selectedOrder.status === 'rejected' && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm text-red-800 mb-2">Rejection Reason</h3>
                  <p className="text-sm text-red-700">
                    {selectedOrder.rejection_reason || 'No reason provided'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}