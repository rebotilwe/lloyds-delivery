import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, ChevronDown, ChevronUp, MapPin, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderTracker from '@/components/orders/OrderTracker';
import { format } from 'date-fns';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'];

function ActiveOrderCard({ order }) {
  return (
    <Card className="overflow-hidden border-2 border-secondary shadow-md">
      <div className="bg-secondary px-4 py-2 flex items-center gap-2">
        <Truck className="w-4 h-4 text-secondary-foreground animate-pulse" />
        <span className="text-secondary-foreground text-sm font-semibold">Live Order</span>
        <span className="ml-auto text-secondary-foreground/80 text-xs">{order.restaurant_name}</span>
      </div>
      <CardContent className="pt-4 space-y-4">
        <OrderTracker status={order.status} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="font-bold text-secondary">R{order.total?.toFixed(2)}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Items</p>
            <p className="font-semibold text-foreground">{order.items?.length || 0} item(s)</p>
          </div>
        </div>
        {order.driver_name && (
          <div className="flex items-center gap-2 text-sm bg-primary/5 rounded-lg px-3 py-2">
            <Truck className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Driver:</span>
            <span className="font-medium text-foreground">{order.driver_name}</span>
          </div>
        )}
        {order.delivery_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{order.delivery_address}</span>
          </div>
        )}
        <div className="space-y-1 pt-1 border-t border-border">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span>R{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderHistoryCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground leading-tight">{order.restaurant_name}</h3>
              <p className="text-xs text-muted-foreground">
                {order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, HH:mm') : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <OrderStatusBadge status={order.status} />
            <span className="font-bold text-secondary whitespace-nowrap">R{order.total?.toFixed(2)}</span>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3 border-t border-border">
          <div className="space-y-1 pt-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                <span>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>R{order.delivery_fee?.toFixed(2)}</span>
          </div>
          {order.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{order.delivery_address}</span>
            </div>
          )}
          {order.driver_name && (
            <div className="text-sm text-muted-foreground">
              Driver: <span className="font-medium text-card-foreground">{order.driver_name}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CustomerOrders() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customerOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Real-time updates
  useEffect(() => {
    const unsub = base44.entities.Order.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['customerOrders', user?.email] });
    });
    return unsub;
  }, [user?.email, queryClient]);

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">No orders yet</p>
          <p className="text-muted-foreground text-sm mt-1">Browse restaurants and place your first order</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Orders</h2>
              <div className="space-y-4">
                {activeOrders.map(order => <ActiveOrderCard key={order.id} order={order} />)}
              </div>
            </div>
          )}

          {pastOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order History</h2>
              <div className="space-y-3">
                {pastOrders.map(order => <OrderHistoryCard key={order.id} order={order} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}