import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { api } from '@/api/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Button,
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Eye,
  RefreshCw,
  Package2,
  LayoutList,
  X,
  MapPin,
  Phone,
  User,
  Truck,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Package,
  ChevronRight,
  ShoppingBag,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const statuses = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
];

// Helper function to format status for display
const formatOrderStatus = (status) => {
  if (!status) return 'Pending';
  
  const statusMap = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready_for_pickup': 'Ready for Pickup',
    'picked_up': 'Picked Up',
    'on_the_way': 'On the Way',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'pending_approval': 'Pending Approval',
    'pending_driver': 'Pending Driver',
    'assigned': 'Assigned',
    'rejected': 'Rejected',
  };
  
  return statusMap[status] || status.replace(/_/g, ' ');
};

const formatCurrency = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

// Order Details Modal Component
function OrderDetailsModal({ order, isOpen, onClose, drivers = [] }) {
  const [loading, setLoading] = useState(false);
  
  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || driver?.full_name || `Driver #${driverId}`;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'rejected': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const isPackage = order?.delivery_type && order.delivery_type !== 'food';
  const items = typeof order?.items === 'string' ? JSON.parse(order.items || '[]') : (order?.items || []);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getStatusIcon(order.status)}
            Order #{order.id}
            <Badge variant="outline" className="ml-2">
              {isPackage ? 'Package Delivery' : 'Food Delivery'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Created on {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : 'Unknown date'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Status and Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold">Order Status</h3>
                  </div>
                  <OrderStatusBadge status={order.status || 'pending'} className="text-sm" />
                  {order.status === 'rejected' && order.admin_rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-700">
                      <strong>Rejection reason:</strong> {order.admin_rejection_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold">Payment</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(order.total)}</p>
                  <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'} className="mt-1">
                    {order.payment_status === 'paid' ? 'Paid' : 'Pending Payment'}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Customer Information */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold">Customer Information</h3>
                </div>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {order.customer_name || '-'}</p>
                  <p><strong>Email:</strong> {order.customer_email || '-'}</p>
                  {order.customer_phone && (
                    <p><strong>Phone:</strong> {order.customer_phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Driver Information */}
            {order.driver_id && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-purple-500" />
                    <h3 className="font-semibold">Driver Information</h3>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Driver:</strong> {getDriverName(order.driver_id)}</p>
                    {order.driver_phone && (
                      <p><strong>Phone:</strong> {order.driver_phone}</p>
                    )}
                    {order.driver_vehicle_type && (
                      <p><strong>Vehicle:</strong> {order.driver_vehicle_type}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Restaurant/Package Info */}
            {!isPackage ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold">Restaurant Information</h3>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Restaurant:</strong> {order.restaurant_name || '-'}</p>
                    {order.restaurant_address && (
                      <p><strong>Address:</strong> {order.restaurant_address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-purple-500" />
                    <h3 className="font-semibold">Package Details</h3>
                  </div>
                  <div className="space-y-3">
                    {order.pickup_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Pickup Address</p>
                          <p className="text-sm">{order.pickup_address}</p>
                        </div>
                      </div>
                    )}
                    {order.recipient_name && (
                      <div>
                        <p className="text-xs text-gray-500">Recipient</p>
                        <p className="text-sm">{order.recipient_name}</p>
                        {order.recipient_phone && (
                          <p className="text-xs text-blue-600">{order.recipient_phone}</p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {order.package_weight > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">Weight</p>
                          <p className="text-sm">{order.package_weight} kg</p>
                        </div>
                      )}
                      {order.package_dimensions && (
                        <div>
                          <p className="text-xs text-gray-500">Dimensions</p>
                          <p className="text-sm">{order.package_dimensions} cm</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {order.requires_signature && (
                        <Badge variant="outline" className="text-blue-600">
                          📝 Signature Required
                        </Badge>
                      )}
                      {order.is_fragile && (
                        <Badge variant="outline" className="text-orange-600">
                          ⚠️ Fragile
                        </Badge>
                      )}
                    </div>
                    {order.package_description && (
                      <div>
                        <p className="text-xs text-gray-500">Description</p>
                        <p className="text-sm">{order.package_description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold">Delivery Address</h3>
                </div>
                <p>{order.delivery_address || 'No address provided'}</p>
              </CardContent>
            </Card>

            {/* Order Items - Food Only */}
            {!isPackage && items.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold">Order Items</h3>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(order.delivery_fee || 0)}</span>
                    </div>
                    {order.discount_applied > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount_applied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {order.notes && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold">Additional Notes</h3>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold">Order Timeline</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Created</span>
                    <span className="text-gray-500">
                      {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                    </span>
                  </div>
                  {order.confirmed_at && (
                    <div className="flex justify-between text-sm">
                      <span>Confirmed</span>
                      <span className="text-gray-500">{format(new Date(order.confirmed_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  )}
                  {order.delivered_at && (
                    <div className="flex justify-between text-sm">
                      <span>Delivered</span>
                      <span className="text-gray-500">{format(new Date(order.delivered_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  )}
                  {order.cancelled_at && (
                    <div className="flex justify-between text-sm">
                      <span>Cancelled</span>
                      <span className="text-gray-500">{format(new Date(order.cancelled_at), 'dd MMM yyyy, HH:mm')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mobile Order Card Component
const MobileOrderCard = ({ order, onViewDetails, drivers = [] }) => {
  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || driver?.full_name || `Driver #${driverId}`;
  };

  const isPackage = order?.delivery_type && order.delivery_type !== 'food';

  return (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewDetails(order)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-1 rounded">
                #{order.id}
              </span>
              {isPackage && (
                <Badge variant="outline" className="text-purple-600 text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  Package
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, HH:mm') : '-'}
            </p>
          </div>
          <OrderStatusBadge status={order.status || 'pending'} />
        </div>
        
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">Customer</p>
            <p className="text-sm font-medium">{order.customer_name || '-'}</p>
            <p className="text-xs text-gray-400">{order.customer_email || 'No email'}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">{isPackage ? 'Package From' : 'Restaurant'}</p>
            <p className="text-sm font-medium">{isPackage ? order.pickup_address?.split(',')[0] : order.restaurant_name || '-'}</p>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(order.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Driver</p>
              <p className="text-sm font-medium">{getDriverName(order.driver_id)}</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(order);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminOrders({ orders = [], drivers = [], onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mobileView, setMobileView] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Check if mobile view on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_email?.toLowerCase().includes(q) ||
        order.restaurant_name?.toLowerCase().includes(q) ||
        String(order.id).includes(q) ||
        (order.pickup_address && order.pickup_address.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || (order.status || 'pending') === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = orders.filter(o => (o.status || 'pending') === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const pendingApproval = orders.filter(o => o.status === 'pending_approval').length;

    return { pending, delivered, cancelled, pendingApproval, total: orders.length };
  }, [orders]);

  // Get driver name by ID
  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || driver?.full_name || `Driver #${driverId}`;
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  const isPackageOrder = (order) => {
    return order?.delivery_type && order.delivery_type !== 'food';
  };

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-medium text-white">
                <LayoutList className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Order management
              </div>
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">All Orders</h3>
              <p className="hidden sm:block mt-1 text-sm text-slate-500">
                View all customer orders, their status, and assigned drivers.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs text-slate-500">Total</p>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs text-slate-500">Pending</p>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold text-amber-600">{stats.pending}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs text-slate-500">Delivered</p>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold text-emerald-600">{stats.delivered}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs text-slate-500">Cancelled</p>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold text-rose-600">{stats.cancelled}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                <p className="text-[10px] sm:text-xs text-slate-500">Awaiting Approval</p>
                <p className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold text-purple-600">{stats.pendingApproval}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 sm:mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, order #..."
                  className="h-9 sm:h-11 pl-9 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 sm:h-11 w-full sm:w-56 text-sm">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>
                      {formatOrderStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={onRefresh} variant="outline" className="h-9 sm:h-11 rounded-xl text-sm">
              <RefreshCw className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Mobile Card View */}
        {mobileView ? (
          <div className="p-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Package2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No orders found</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Try adjusting the filters or search terms.
                  </p>
                </div>
              </div>
            ) : (
              filteredOrders.map(order => (
                <MobileOrderCard 
                  key={order.id} 
                  order={order} 
                  onViewDetails={handleViewDetails}
                  drivers={drivers}
                />
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Order ID</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Type</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Date</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Customer</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Restaurant/From</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Total</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Driver</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                          <Package2 className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">No orders found</p>
                        <p className="mt-1 max-w-sm text-sm text-slate-500">
                          Try adjusting the filters or search terms.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map(order => (
                    <TableRow 
                      key={order.id} 
                      className="transition hover:bg-slate-50/60 cursor-pointer"
                      onClick={() => handleViewDetails(order)}
                    >
                      <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                        #{order.id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {isPackageOrder(order) ? (
                          <Badge variant="outline" className="text-purple-600">
                            <Package className="w-3 h-3 mr-1" />
                            Package
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <ShoppingBag className="w-3 h-3 mr-1" />
                            Food
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {order.created_at ? format(new Date(order.created_at), 'dd MMM HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {order.customer_name || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.customer_email || 'No email'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        {isPackageOrder(order) 
                          ? order.pickup_address?.split(',')[0] || 'Pickup'
                          : order.restaurant_name || '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <OrderStatusBadge status={order.status || 'pending'} />
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {getDriverName(order.driver_id)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs sm:text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(order);
                            }}
                          >
                            <Eye className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        drivers={drivers}
      />
    </>
  );
}