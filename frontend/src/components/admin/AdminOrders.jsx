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
import {
  Badge,
} from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Eye,
  RefreshCw,
  Package2,
  Truck,
  CircleAlert,
  LayoutList,
} from 'lucide-react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { cn } from '@/lib/utils';

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

const formatCurrency = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

export default function AdminOrders({ orders = [], drivers = [], onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      onRefresh?.();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleAssignDriver = async (orderId, driverEmail) => {
    try {
      const driver = drivers.find(d => d.email === driverEmail);
      await api.put(`/orders/${orderId}/assign`, {
        driver_id: driver?.id,
        driver_email: driverEmail,
        driver_name: driver?.full_name || driverEmail,
      });
      toast.success('Driver assigned');
      onRefresh?.();
    } catch {
      toast.error('Failed to assign driver');
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
              <LayoutList className="h-3.5 w-3.5" />
              Order management
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">All Orders</h3>
            <p className="mt-1 text-sm text-slate-500">
              View, update, and assign drivers to customer orders.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Total</p>
              <p className="mt-1 text-lg font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{stats.pending}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Delivered</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{stats.delivered}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Cancelled</p>
              <p className="mt-1 text-lg font-semibold text-rose-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, restaurant, order ID..."
                className="h-11 pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full sm:w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={onRefresh} variant="outline" className="h-11 rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-600">Date</TableHead>
              <TableHead className="font-semibold text-slate-600">Customer</TableHead>
              <TableHead className="font-semibold text-slate-600">Restaurant</TableHead>
              <TableHead className="font-semibold text-slate-600">Total</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Driver</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14">
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
                  <TableCell className="text-sm text-slate-600">
                    {order.created_at ? format(new Date(order.created_at), 'dd MMM HH:mm') : '-'}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-slate-900">
                      {order.customer_name || '-'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.customer_email || 'No email'}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm font-medium text-slate-700">
                    {order.restaurant_name || '-'}
                  </TableCell>

                  <TableCell className="font-semibold text-slate-900">
                    {formatCurrency(order.total)}
                  </TableCell>

                  <TableCell>
                    <div className="w-40">
                      <Select
                        value={order.status || 'pending'}
                        onValueChange={val => handleStatusChange(order.id, val)}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-slate-200">
                          <SelectValue>
                            <OrderStatusBadge status={order.status || 'pending'} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="w-44">
                      <Select
                        value={order.driver_email || 'none'}
                        onValueChange={val => val !== 'none' && handleAssignDriver(order.id, val)}
                      >
                        <SelectTrigger className="h-9 rounded-xl border-slate-200">
                          <SelectValue placeholder="Assign driver" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {drivers.map(d => (
                            <SelectItem key={d.email} value={d.email}>
                              {d.full_name || d.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => window.open(`/admin/orders/${order.id}`, '_blank')}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}