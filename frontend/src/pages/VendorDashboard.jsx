import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { format, subDays, isWithinInterval } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Eye,
  RefreshCw,
  Search,
  Download,
  Printer,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedPrepTime, setEstimatedPrepTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const { socket, online } = useSocket();

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update document title with pending count
  const pendingOrdersCount = (orders || []).filter(o => o?.status === 'pending').length;
  useEffect(() => {
    document.title = pendingOrdersCount > 0 
      ? `(${pendingOrdersCount}) Vendor Orders` 
      : 'Vendor Dashboard';
  }, [pendingOrdersCount]);

  // Play sound for new orders
  const playNewOrderSound = useCallback(() => {
    const audio = new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZCBub3RpZmljYXRpb24=');
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, []);

  // Listen for new orders via socket
  useEffect(() => {
    if (socket && online) {
      console.log("🔌 Socket connected, listening for new orders");
      
      socket.on('new-order', (data) => {
        console.log("🔔 New order notification received:", data);
        playNewOrderSound();
        fetchOrders();
        toast.info(`📦 New order #${data?.orderId} received!`, {
          duration: 8000,
          action: {
            label: 'View Order',
            onClick: () => setShowDetails(true),
          },
        });
      });
      
      return () => {
        socket.off('new-order');
      };
    }
  }, [socket, online, playNewOrderSound]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/orders');
      
      let ordersData = [];
      if (response && response.data && Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response && Array.isArray(response)) {
        ordersData = response;
      }
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrders = async () => {
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
      setSelectedOrders([]);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const bulkUpdateStatus = async (status) => {
    if (selectedOrders.length === 0) {
      toast.error('No orders selected');
      return;
    }
    
    const loadingToast = toast.loading(`Updating ${selectedOrders.length} orders...`);
    
    try {
      for (const orderId of selectedOrders) {
        await api.put(`/vendor/orders/${orderId}/status`, { status });
      }
      toast.success(`${selectedOrders.length} orders updated to ${status}`, { id: loadingToast });
      fetchOrders();
      setSelectedOrders([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update some orders', { id: loadingToast });
    }
  };

  const handleAcceptOrder = (order) => {
    setSelectedOrder(order);
    setEstimatedPrepTime('');
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
    setShowDetails(true);
  };

  const confirmReject = () => {
    if (!rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateOrderStatus(selectedOrder.id, 'rejected', { rejection_reason: rejectionReason });
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = pendingOrders.map(o => o.id);
    setSelectedOrders(pendingIds);
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  const formatPrice = (price) => {
    const num = Number(price);
    return isNaN(num) ? '0.00' : num.toFixed(2);
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

  // Filter orders by search term and date range
  const filteredOrders = useMemo(() => {
    let filtered = orders || [];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return isWithinInterval(orderDate, {
          start: dateRange.from,
          end: dateRange.to || new Date(),
        });
      });
    }
    
    return filtered;
  }, [orders, searchTerm, dateRange]);

  const pendingOrders = (filteredOrders || []).filter(o => o?.status === 'pending');
  const activeOrders = (filteredOrders || []).filter(o => ['confirmed', 'preparing'].includes(o?.status));
  const completedOrders = (filteredOrders || []).filter(o => ['ready_for_pickup', 'picked_up', 'on_the_way', 'delivered'].includes(o?.status));

  // Revenue calculations
  const totalRevenue = (orders || [])
    .filter(o => o?.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
  
  const pendingValue = (orders || [])
    .filter(o => o?.status === 'pending')
    .reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
  
  const todayRevenue = (orders || [])
    .filter(o => {
      const today = new Date();
      const orderDate = new Date(o?.created_at);
      return o?.status === 'delivered' && 
        orderDate.toDateString() === today.toDateString();
    })
    .reduce((sum, o) => sum + (Number(o?.total) || 0), 0);

  // Export to CSV
  const exportOrders = () => {
    const csvData = (orders || []).map(order => ({
      'Order ID': order.id,
      'Customer Name': order.customer_name,
      'Customer Email': order.customer_email,
      'Total': formatPrice(order.total),
      'Status': order.status,
      'Delivery Fee': formatPrice(order.delivery_fee),
      'Date': order.created_at ? format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
      'Items Count': order.items?.length || 0,
    }));
    
    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Orders exported successfully');
  };

  // Print order ticket
  const printOrderTicket = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .order-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Kota King Restaurant</h2>
          <p>Order #${order.id}</p>
          <p>Date: ${order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
        </div>
        
        <div class="order-details">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${order.customer_name || 'Guest'}</p>
          <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
          <p><strong>Delivery Address:</strong> ${order.delivery_address || 'N/A'}</p>
        </div>
        
        <h3>Order Items</h3>
        <table>
          <thead>
            <tr><th>Item</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${(order.items || []).map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>R${formatPrice(item.price)}</td>
                <td>R${formatPrice(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Delivery Fee: R${formatPrice(order.delivery_fee)}</p>
          <p>Total: R${formatPrice(order.total)}</p>
        </div>
        
        <p style="text-align: center; margin-top: 40px;">Thank you for your order!</p>
        <button onclick="window.print();window.close();" style="margin-top: 20px; padding: 10px;">Print</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const OrderCard = ({ order }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox for bulk actions */}
          {showBulkActions && order.status === 'pending' && (
            <button
              onClick={() => toggleOrderSelection(order.id)}
              className="mt-1"
            >
              {selectedOrders.includes(order.id) ? (
                <CheckSquare className="w-5 h-5 text-green" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}
          
          <div className="flex-1">
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
                
                {/* Estimated prep time display */}
                {order.estimated_prep_time && (
                  <p className="text-xs text-blue-600 mt-1">
                    ⏱️ Est. prep: {order.estimated_prep_time} min
                  </p>
                )}
                
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Items:</p>
                  {order.items?.length > 0 ? (
                    <>
                      {order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx} className="text-xs">{item.quantity}x {item.name}</p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">No items</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green text-lg">R{formatPrice(order.total)}</p>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => printOrderTicket(order)}
                  >
                    <Printer className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
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
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-green">R{formatPrice(todayRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders Value</p>
                <p className="text-2xl font-bold text-blue-600">R{formatPrice(pendingValue)}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue (All Time)</p>
                <p className="text-2xl font-bold text-purple-600">R{formatPrice(totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-gray-500">Manage incoming orders from customers</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkActions(!showBulkActions)}
            variant="outline"
            size="sm"
          >
            {showBulkActions ? 'Cancel Bulk' : 'Bulk Actions'}
          </Button>
          <Button onClick={exportOrders} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={refreshOrders} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedOrders.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <span className="font-semibold">{selectedOrders.length} orders selected</span>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-2">
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => bulkUpdateStatus('confirmed')} className="bg-green text-white">
                Accept All
              </Button>
              <Button size="sm" onClick={selectAllPending} variant="outline">
                Select All Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by customer name, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {dateRange.from ? (
              `${format(dateRange.from, 'dd/MM/yy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yy') : 'Present'}`
            ) : (
              'Filter by date'
            )}
          </Button>
          
          {showDatePicker && (
            <Card className="absolute right-0 mt-2 z-10 w-64">
              <CardContent className="p-3 space-y-3">
                <div>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDateRange({ from: subDays(new Date(), 7), to: new Date() });
                      setShowDatePicker(false);
                    }}
                    variant="outline"
                  >
                    Last 7 days
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDateRange({ from: null, to: null });
                      setShowDatePicker(false);
                    }}
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Orders Tabs */}
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

      {/* Order Details Modal */}
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
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Order Details
                </h3>
                <p className="text-xs text-gray-500">
                  Created: {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'dd MMM yyyy, h:mm a') : '-'}
                </p>
                {selectedOrder.estimated_prep_time && (
                  <p className="text-xs text-blue-600 mt-1">
                    Estimated Prep Time: {selectedOrder.estimated_prep_time} minutes
                  </p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>R{formatPrice(selectedOrder.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span className="text-green">R{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.status === 'pending' && (
                <div className="space-y-4">
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
                  <div className="flex gap-3">
                    <Button onClick={confirmAccept} className="flex-1 bg-green text-white">
                      Accept Order
                    </Button>
                    <Button onClick={confirmReject} variant="destructive" className="flex-1">
                      Reject Order
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.status === 'rejected' && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    Rejection reason: {selectedOrder.rejection_reason || 'Not specified'}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={() => printOrderTicket(selectedOrder)} variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}