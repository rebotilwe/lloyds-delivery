import React from 'react';
import { DollarSign, ShoppingBag, Users, Truck, TrendingUp, Clock } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, change }) => {
  // Ensure value is a number and format properly
  const formattedValue = typeof value === 'number' ? value : Number(value) || 0;
  
  return (
    <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold">
          {title.includes('Revenue') ? `R${formattedValue.toFixed(2)}` : formattedValue}
        </p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
      </div>
    </div>
  );
};

export default function AdminStats({ orders = [], users = [] }) {
  // Safe number calculations
  const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0;
  
  const todayRevenue = orders?.reduce((sum, order) => {
    const orderDate = order.created_at ? new Date(order.created_at) : null;
    const today = new Date();
    if (orderDate && orderDate.toDateString() === today.toDateString()) {
      return sum + (Number(order.total) || 0);
    }
    return sum;
  }, 0) || 0;
  
  const activeOrders = orders?.filter(order => 
    order.status && !['delivered', 'cancelled'].includes(order.status)
  ).length || 0;
  
  const totalCustomers = users?.filter(user => user.role === 'customer').length || 0;
  const totalDrivers = users?.filter(user => user.role === 'driver').length || 0;
  const activeDrivers = users?.filter(user => 
    user.role === 'driver' && user.driver_status === 'approved'
  ).length || 0;
  
  const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
  const completedOrders = orders?.filter(order => order.status === 'delivered').length || 0;
  
  const completionRate = orders?.length > 0 
    ? ((completedOrders / orders.length) * 100).toFixed(1) 
    : 0;

  return (
    <>
      {/* Row 1 - Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          icon={DollarSign}
          color="bg-green"
          change={12.5}
        />
        <StatCard
          title="Today's Revenue"
          value={todayRevenue}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          icon={Clock}
          color="bg-orange-500"
          change={-5.2}
        />
        <StatCard
          title="Active Drivers"
          value={activeDrivers}
          icon={Truck}
          color="bg-purple-500"
          change={8.3}
        />
      </div>

      {/* Row 2 - Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs text-gray-500">Total Orders</p>
          <p className="text-xl font-bold">{orders?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-xl font-bold">{completionRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs text-gray-500">Total Customers</p>
          <p className="text-xl font-bold">{totalCustomers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-xs text-gray-500">Total Drivers</p>
          <p className="text-xl font-bold">{totalDrivers}</p>
        </div>
      </div>

      {/* Row 3 - Order Status Summary */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-lg mb-4">Order Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{pendingOrders}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {orders?.filter(o => o.status === 'confirmed').length || 0}
            </p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {orders?.filter(o => o.status === 'preparing').length || 0}
            </p>
            <p className="text-xs text-gray-500">Preparing</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {orders?.filter(o => o.status === 'on_the_way').length || 0}
            </p>
            <p className="text-xs text-gray-500">On The Way</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </div>
      </div>
    </>
  );
}