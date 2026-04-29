import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, ShoppingBag, Store, UtensilsCrossed, Users } from 'lucide-react';
import AdminStats from '@/components/admin/AdminStats';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminRestaurants from '@/components/admin/AdminRestaurants';
import AdminMenuItems from '@/components/admin/AdminMenuItems';
import AdminUsers from '@/components/admin/AdminUsers';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'restaurants', label: 'Restaurants', icon: Store },
  { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
  { id: 'users', label: 'Users', icon: Users },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: () => base44.entities.Restaurant.list('-created_date', 100),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const drivers = users.filter(u => u.role === 'driver');

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
  const refreshRestaurants = () => queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage Lloyd's Delivery platform</p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <AdminStats orders={orders} users={users} />

            {/* Recent orders preview */}
            <AdminOrders
              orders={orders.slice(0, 10)}
              drivers={drivers}
              onRefresh={refreshOrders}
            />
          </div>
        )}

        {activeTab === 'orders' && (
          <AdminOrders orders={orders} drivers={drivers} onRefresh={refreshOrders} />
        )}

        {activeTab === 'restaurants' && (
          <AdminRestaurants restaurants={restaurants} onRefresh={refreshRestaurants} />
        )}

        {activeTab === 'menu' && (
          <AdminMenuItems restaurants={restaurants} />
        )}

        {activeTab === 'users' && (
          <AdminUsers users={users} />
        )}
      </div>
    </div>
  );
}