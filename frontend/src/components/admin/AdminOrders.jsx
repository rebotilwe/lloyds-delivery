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
  Search,
  Eye,
  RefreshCw,
  Package2,
  LayoutList,
  X,
} from 'lucide-react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';

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
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || status.replace(/_/g, ' ');
};

const formatCurrency = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

export default function AdminOrders({ orders = [], drivers = [], onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mobileView, setMobileView] = useState(false);

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
        String(order.id).includes(q);

      const matchesStatus = statusFilter === 'all' || (order.status || 'pending') === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = orders.filter(o => (o.status || 'pending') === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    return { pending, delivered, cancelled, total: orders.length };
  }, [orders]);

  // Get driver name by ID
  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || driver?.full_name || `Driver #${driverId}`;
  };

  // Mobile Card View Component
  const MobileOrderCard = ({ order }) => (
    <div className="bg-white border rounded-xl p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-1 rounded">
            #{order.id}
          </span>
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
          <p className="text-xs text-gray-500">Restaurant</p>
          <p className="text-sm font-medium">{order.restaurant_name || '-'}</p>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-green">{formatCurrency(order.total)}</p>
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
          onClick={() => window.open(`/admin/orders/${order.id}`, '_blank')}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </div>
    </div>
  );

  return (
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

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
          </div>
        </div>

        {/* Filters - Mobile Friendly */}
        <div className="mt-4 sm:mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
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
              <MobileOrderCard key={order.id} order={order} />
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
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Date</TableHead>
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Customer</TableHead>
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Restaurant</TableHead>
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Total</TableHead>
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Driver</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14">
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
                  <TableRow key={order.id} className="transition hover:bg-slate-50/60">
                    <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                      #{order.id}
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
                      {order.restaurant_name || '-'}
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
                          onClick={() => window.open(`/admin/orders/${order.id}`, '_blank')}
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
  );
}