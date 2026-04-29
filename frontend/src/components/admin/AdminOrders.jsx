import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

export default function AdminOrders({ orders, drivers, onRefresh }) {
  const handleStatusChange = async (orderId, status) => {
    await base44.entities.Order.update(orderId, { status });
    toast.success('Order status updated');
    onRefresh();
  };

  const handleAssignDriver = async (orderId, driverEmail) => {
    const driver = drivers.find(d => d.email === driverEmail);
    await base44.entities.Order.update(orderId, {
      driver_email: driverEmail,
      driver_name: driver?.full_name || driverEmail,
    });
    toast.success('Driver assigned');
    onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg">All Orders</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="text-sm">
                    {order.created_date ? format(new Date(order.created_date), 'dd MMM HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{order.customer_name || order.customer_email}</TableCell>
                  <TableCell className="text-sm font-medium">{order.restaurant_name}</TableCell>
                  <TableCell className="font-semibold">R{order.total?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={order.status} onValueChange={val => handleStatusChange(order.id, val)}>
                      <SelectTrigger className="h-8 w-36">
                        <OrderStatusBadge status={order.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(s => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.driver_email || 'none'}
                      onValueChange={val => val !== 'none' && handleAssignDriver(order.id, val)}
                    >
                      <SelectTrigger className="h-8 w-40">
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