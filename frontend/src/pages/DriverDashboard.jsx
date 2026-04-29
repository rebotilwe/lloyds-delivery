import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck, MapPin, Package, CheckCircle2, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { format } from 'date-fns';

const statusFlow = {
  confirmed: 'ready_for_pickup',
  ready_for_pickup: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

const statusActions = {
  confirmed: 'Mark Ready for Pickup',
  ready_for_pickup: 'Pick Up Order',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAvailable(u?.is_available !== false);
    }).catch(() => {});
  }, []);

  // Available orders (unassigned, status confirmed or ready_for_pickup)
  const { data: availableOrders = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['availableOrders'],
    queryFn: async () => {
      const orders = await base44.entities.Order.list('-created_date', 50);
      return orders.filter(o =>
        !o.driver_email &&
        ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status)
      );
    },
    refetchInterval: 10000,
  });

  // My assigned orders
  const { data: myOrders = [], isLoading: loadingMy } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ driver_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const activeOrders = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = myOrders.filter(o => o.status === 'delivered');

  const acceptMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.Order.update(order.id, {
        driver_email: user.email,
        driver_name: user.full_name || user.email,
        status: order.status === 'pending' ? 'confirmed' : order.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableOrders'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success('Order accepted!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      await base44.entities.Order.update(orderId, { status: newStatus });
      if (newStatus === 'delivered') {
        const total = (user?.total_deliveries || 0) + 1;
        await base44.auth.updateMe({ total_deliveries: total });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success('Status updated');
    },
  });

  const toggleAvailability = async (val) => {
    setIsAvailable(val);
    await base44.auth.updateMe({ is_available: val });
    toast.success(val ? 'You are now available' : 'You are now offline');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Driver Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {user?.full_name || 'Driver'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-2">
          <span className="text-sm text-muted-foreground">Available</span>
          <Switch checked={isAvailable} onCheckedChange={toggleAvailability} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Orders', value: activeOrders.length, icon: Package, color: 'text-secondary' },
          { label: 'Available', value: availableOrders.length, icon: Clock, color: 'text-blue-500' },
          { label: 'Completed', value: completedOrders.length, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Total Deliveries', value: user?.total_deliveries || 0, icon: Truck, color: 'text-primary' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active deliveries */}
      {activeOrders.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">Active Deliveries</h2>
          <div className="space-y-4">
            {activeOrders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{order.restaurant_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {order.created_date ? format(new Date(order.created_date), 'HH:mm') : ''} • {order.items?.length} items • R{order.total?.toFixed(2)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    {order.delivery_address}
                  </div>
                  {statusFlow[order.status] && (
                    <Button
                      className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: statusFlow[order.status] })}
                      disabled={updateStatusMutation.isPending}
                    >
                      {statusActions[order.status]}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available orders */}
      <section>
        <h2 className="text-lg font-bold mb-4">Available Orders</h2>
        {loadingAvailable ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : availableOrders.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No orders available right now</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {availableOrders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{order.restaurant_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length} items • R{order.total?.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" /> {order.delivery_address}
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptMutation.mutate(order)}
                      disabled={acceptMutation.isPending}
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    >
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}