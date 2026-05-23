import React from 'react';
import { DollarSign, ShoppingBag, Users, Truck, TrendingUp, Clock, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, change }) => {
  const formattedValue = typeof value === 'number' ? value : Number(value) || 0;
  
  return (
    <div className="bg-white rounded-xl border p-3 sm:p-4 lg:p-6 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
        </div>
        {change && (
          <span className={`text-[10px] sm:text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-base sm:text-xl lg:text-2xl font-bold">
          {title.includes('Revenue') ? `R${formattedValue.toFixed(2)}` : formattedValue}
        </p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{title}</p>
      </div>
    </div>
  );
};

// Mobile Stats Card for secondary stats
const MobileStatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border p-3 text-center">
    <div className={`p-2 rounded-lg ${color} inline-flex mb-2`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="text-lg font-bold">{value}</p>
    <p className="text-[10px] text-gray-500">{title}</p>
  </div>
);

// Order Status Card for mobile
const OrderStatusCard = ({ title, value, color }) => (
  <div className="bg-white rounded-xl border p-3 text-center">
    <p className="text-xl font-bold text-${color}-600">{value}</p>
    <p className="text-[10px] text-gray-500">{title}</p>
  </div>
);

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
  const confirmedOrders = orders?.filter(order => order.status === 'confirmed').length || 0;
  const preparingOrders = orders?.filter(order => order.status === 'preparing').length || 0;
  const onTheWayOrders = orders?.filter(order => order.status === 'on_the_way').length || 0;
  const completedOrders = orders?.filter(order => order.status === 'delivered').length || 0;
  const cancelledOrders = orders?.filter(order => order.status === 'cancelled').length || 0;
  
  const completionRate = orders?.length > 0 
    ? ((completedOrders / orders.length) * 100).toFixed(1) 
    : 0;

  // Calculate week-over-week growth (mock data for demo)
  const revenueGrowth = orders?.length > 0 ? 12.5 : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Row 1 - Main Stats - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          icon={DollarSign}
          color="bg-green"
          change={revenueGrowth}
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
        />
        <StatCard
          title="Active Drivers"
          value={activeDrivers}
          icon={Truck}
          color="bg-purple-500"
        />
      </div>

      {/* Row 2 - Secondary Stats - Mobile optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <p className="text-[10px] text-gray-500">Total Orders</p>
          </div>
          <p className="text-xl font-bold">{orders?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-[10px] text-gray-500">Completion</p>
          </div>
          <p className="text-xl font-bold">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <p className="text-[10px] text-gray-500">Customers</p>
          </div>
          <p className="text-xl font-bold">{totalCustomers}</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Truck className="w-4 h-4 text-purple-500" />
            <p className="text-[10px] text-gray-500">Total Drivers</p>
          </div>
          <p className="text-xl font-bold">{totalDrivers}</p>
        </div>
      </div>

      {/* Row 3 - Order Status Summary - Responsive */}
      <div className="bg-white rounded-xl border p-3 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-lg">Order Status Summary</h3>
          <div className="text-xs text-gray-400">
            Total: {orders?.length || 0}
          </div>
        </div>
        
        {/* Desktop View - Grid */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{pendingOrders}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{confirmedOrders}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{preparingOrders}</p>
            <p className="text-xs text-gray-500">Preparing</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{onTheWayOrders}</p>
            <p className="text-xs text-gray-500">On The Way</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
        </div>

        {/* Mobile View - Scrollable */}
        <div className="sm:hidden overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <div className="bg-blue-50 rounded-lg p-2 text-center min-w-[80px]">
              <p className="text-sm font-bold text-blue-600">{pendingOrders}</p>
              <p className="text-[10px] text-gray-500">Pending</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2 text-center min-w-[80px]">
              <p className="text-sm font-bold text-yellow-600">{confirmedOrders}</p>
              <p className="text-[10px] text-gray-500">Confirmed</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center min-w-[80px]">
              <p className="text-sm font-bold text-purple-600">{preparingOrders}</p>
              <p className="text-[10px] text-gray-500">Preparing</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center min-w-[80px]">
              <p className="text-sm font-bold text-orange-600">{onTheWayOrders}</p>
              <p className="text-[10px] text-gray-500">On The Way</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center min-w-[80px]">
              <p className="text-sm font-bold text-green-600">{completedOrders}</p>
              <p className="text-[10px] text-gray-500">Delivered</p>
            </div>
            {cancelledOrders > 0 && (
              <div className="bg-red-50 rounded-lg p-2 text-center min-w-[80px]">
                <p className="text-sm font-bold text-red-600">{cancelledOrders}</p>
                <p className="text-[10px] text-gray-500">Cancelled</p>
              </div>
            )}
          </div>
        </div>

        {/* Cancelled Orders Row (Desktop) */}
        {cancelledOrders > 0 && (
          <div className="hidden sm:flex justify-between items-center mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">Cancelled Orders</span>
            </div>
            <span className="font-semibold text-red-600">{cancelledOrders}</span>
          </div>
        )}
      </div>

      {/* Quick Insights - Mobile Friendly */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base mb-2">Quick Insights</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-500">Avg Order Value</p>
            <p className="text-base sm:text-lg font-bold text-green">
              R{orders?.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Success Rate</p>
            <p className="text-base sm:text-lg font-bold text-blue-600">
              {completionRate}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Pending Orders</p>
            <p className="text-base sm:text-lg font-bold text-orange-600">
              {pendingOrders}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Active Drivers</p>
            <p className="text-base sm:text-lg font-bold text-purple-600">
              {activeDrivers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}