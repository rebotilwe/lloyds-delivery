import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Truck,
  DollarSign,
  RefreshCw,
  Clock,
  Loader2,
  Eye,
  Settings,
  Download,
  UtensilsCrossed,
} from 'lucide-react';

import AdminStats from '@/components/admin/AdminStats';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminRestaurants from '@/components/admin/AdminRestaurants';
import AdminMenuItems from '@/components/admin/AdminMenuItems';
import AdminUsers from '@/components/admin/AdminUsers';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Simplified tabs for mobile with paths
const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'bg-emerald-500', path: '/admin' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, color: 'bg-blue-500', path: '/admin/orders' },
  { id: 'restaurants', label: 'Restaurants', icon: Store, color: 'bg-purple-500', path: '/admin/restaurants' },
  { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed, color: 'bg-orange-500', path: '/admin/menu' },
  { id: 'drivers', label: 'Drivers', icon: Truck, color: 'bg-amber-500', path: '/admin/drivers' },
  { id: 'users', label: 'Users', icon: Users, color: 'bg-cyan-500', path: '/admin/users' },
  { id: 'finance', label: 'Finance', icon: DollarSign, color: 'bg-green-500', path: '/admin/finance' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'bg-gray-500', path: '/admin/settings' },
];

// Simplified Stat Card
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl border p-4 hover:shadow-md transition">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
        {trend && (
          <p className={cn("text-xs mt-1", trend > 0 ? "text-green-600" : "text-red-600")}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

// Mobile Tab Button
const MobileTabButton = ({ tab, active, onClick, badge }) => {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition min-w-[70px] relative",
        active 
          ? "bg-navy text-white" 
          : "bg-white text-gray-600 hover:bg-gray-50 border"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{tab.label}</span>
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
};

// Desktop Tab Button
const DesktopTabButton = ({ tab, active, onClick, badge }) => {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
        active
          ? "bg-navy text-white shadow"
          : "bg-white text-gray-600 hover:bg-gray-50 border"
      )}
    >
      <Icon className="w-4 h-4" />
      {tab.label}
      {badge > 0 && (
        <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
};

// Driver Documents Review Component
const DriverDocuments = ({ driver, onClose, onApprove, onReject }) => {
  const [viewingDoc, setViewingDoc] = useState(null);

  const documents = [
    { key: 'id_copy', label: 'ID Copy', required: true },
    { key: 'pdp', label: 'PDP License', required: true },
    { key: 'profile_photo', label: 'Profile Photo', required: true },
    { key: 'car_license', label: 'Vehicle License', required: false },
  ];

  const getDocumentUrl = (docKey) => {
    const docPath = driver[docKey];
    if (!docPath) return null;
    if (docPath.startsWith('http')) return docPath;
    return `https://lloyds-delivery.onrender.com${docPath}`;
  };

  const isImage = (url) => url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) !== null;
  const isPDF = (url) => url?.match(/\.(pdf)$/i) !== null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Driver Documents</DialogTitle>
          <p className="text-sm text-gray-500">
            {driver.full_name || driver.name} ({driver.email})
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {(driver.car_make || driver.license_plate) && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium">Vehicle: {driver.car_make} {driver.car_model}</p>
              <p className="text-xs text-gray-500">Plate: {driver.license_plate}</p>
            </div>
          )}

          <div className="space-y-2">
            {documents.map(doc => {
              const docUrl = getDocumentUrl(doc.key);
              return (
                <div key={doc.key} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{doc.label}</p>
                    <p className="text-xs text-gray-500">{docUrl ? 'Uploaded' : 'Not uploaded'}</p>
                  </div>
                  {docUrl && (
                    <Button size="sm" variant="outline" onClick={() => setViewingDoc(docUrl)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onApprove} className="flex-1 bg-green text-white">Approve</Button>
            <Button onClick={onReject} variant="destructive" className="flex-1">Reject</Button>
          </div>
        </div>

        {viewingDoc && (
          <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Document Preview</DialogTitle></DialogHeader>
              {isImage(viewingDoc) && <img src={viewingDoc} alt="Document" className="w-full rounded" />}
              {isPDF(viewingDoc) && <iframe src={viewingDoc} className="w-full h-96 rounded" />}
              <Button variant="outline" onClick={() => window.open(viewingDoc, '_blank')}>Download</Button>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Settings Component
const AdminSettings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', current_password: '', new_password: '', confirm_password: '' });

  React.useEffect(() => {
    if (user) setFormData(prev => ({ ...prev, full_name: user.full_name || user.name || '', phone: user.phone || '' }));
  }, [user]);

  const updateProfile = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, { full_name: formData.full_name, phone: formData.phone });
      const updatedUser = { ...user, full_name: formData.full_name, phone: formData.phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (formData.new_password !== formData.confirm_password) return toast.error('Passwords do not match');
    if (formData.new_password.length < 6) return toast.error('Password must be 6+ characters');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { user_id: user.id, current_password: formData.current_password, new_password: formData.new_password });
      toast.success('Password changed');
      setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-4">Profile Settings</h2>
        <div className="space-y-3">
          <Input placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
          <Input value={user?.email} disabled className="bg-gray-50" />
          <Input placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Button onClick={updateProfile} disabled={loading} className="w-full bg-navy text-white">Save Changes</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-4">Change Password</h2>
        <div className="space-y-3">
          <Input type="password" placeholder="Current Password" value={formData.current_password} onChange={e => setFormData({ ...formData, current_password: e.target.value })} />
          <Input type="password" placeholder="New Password" value={formData.new_password} onChange={e => setFormData({ ...formData, new_password: e.target.value })} />
          <Input type="password" placeholder="Confirm Password" value={formData.confirm_password} onChange={e => setFormData({ ...formData, confirm_password: e.target.value })} />
          <Button onClick={changePassword} disabled={loading} variant="outline" className="w-full">Update Password</Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------- MAIN ---------------------- */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);

  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'overview';
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/restaurants')) return 'restaurants';
    if (path.includes('/menu')) return 'menu';
    if (path.includes('/users')) return 'users';
    if (path.includes('/drivers')) return 'drivers';
    if (path.includes('/finance')) return 'finance';
    if (path.includes('/settings')) return 'settings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath);
  
  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  // Handle tab click - navigate to the correct path
  const handleTabClick = (tab) => {
    navigate(tab.path);
  };

  // Data fetching
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders');
        return response?.data || (Array.isArray(response) ? response : []);
      } catch { return []; }
    },
    refetchInterval: 15000,
  });

  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      try {
        const response = await api.get('/restaurants');
        return response?.data || (Array.isArray(response) ? response : []);
      } catch { return []; }
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return response?.data || (Array.isArray(response) ? response : []);
      } catch { return []; }
    },
  });

  const isLoading = ordersLoading || restaurantsLoading || usersLoading;

  const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);
  const pendingDrivers = useMemo(() => drivers.filter(d => d.driver_status === 'pending'), [drivers]);
  const activeDrivers = useMemo(() => drivers.filter(d => d.driver_status === 'approved'), [drivers]);
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(o => o.created_at && new Date(o.created_at).toDateString() === today)
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);
  const completionRate = orders.length ? (completedOrders.length / orders.length) * 100 : 0;
  const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;

  const refreshAll = async () => {
    toast.loading('Refreshing...');
    await queryClient.invalidateQueries();
    toast.dismiss();
    toast.success('Refreshed');
  };

  const approveDriver = async (driver) => {
    await api.put(`/users/${driver.id}`, { driver_status: 'approved', is_available: 1 });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    toast.success(`${driver.name} approved`);
    setShowDocuments(false);
  };

  const rejectDriver = async (driver) => {
    await api.put(`/users/${driver.id}`, { driver_status: 'rejected', is_available: 0 });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    toast.success(`${driver.name} rejected`);
    setShowDocuments(false);
  };

  // Export Orders to CSV
  const exportOrdersToCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const csvData = orders.map(order => ({
      'Order ID': order.id,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Customer': order.customer_name || 'Guest',
      'Restaurant': order.restaurant_name || '-',
      'Total Amount': `R${Number(order.total).toFixed(2)}`,
      'Status': order.status || 'pending',
      'Delivery Address': order.delivery_address || '-',
      'Driver ID': order.driver_id || 'Unassigned',
      'Delivery Fee': `R${Number(order.delivery_fee || 0).toFixed(2)}`,
      'Driver Earnings': `R${Number(order.driver_earning || 0).toFixed(2)}`,
    }));

    const headers = Object.keys(csvData[0]);
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ];
    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${orders.length} orders to CSV`);
  };

  // Export Revenue Summary to CSV
  const exportRevenueSummary = () => {
    const summaryData = [
      { Metric: 'Total Revenue', Value: `R${totalRevenue.toFixed(2)}` },
      { Metric: "Today's Revenue", Value: `R${todayRevenue.toFixed(2)}` },
      { Metric: 'Total Orders', Value: orders.length },
      { Metric: 'Completed Orders', Value: completedOrders.length },
      { Metric: 'Pending Orders', Value: pendingOrders.length },
      { Metric: 'Cancelled Orders', Value: orders.filter(o => o.status === 'cancelled').length },
      { Metric: 'Average Order Value', Value: `R${averageOrderValue.toFixed(2)}` },
      { Metric: 'Completion Rate', Value: `${completionRate.toFixed(1)}%` },
      { Metric: 'Total Delivery Fees', Value: `R${orders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0).toFixed(2)}` },
      { Metric: 'Total Driver Earnings', Value: `R${orders.reduce((sum, o) => sum + (Number(o.driver_earning) || 0), 0).toFixed(2)}` },
    ];

    const headers = ['Metric', 'Value'];
    const csvRows = [
      headers.join(','),
      ...summaryData.map(row => `${row.Metric},${row.Value}`)
    ];
    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Revenue summary exported');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Admin Panel</h1>
          <p className="text-xs text-gray-500">Welcome back, {user?.full_name || 'Admin'}</p>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm" className="text-xs">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard title="Revenue" value={`R${totalRevenue.toFixed(2)}`} icon={DollarSign} color="bg-green" />
        <StatCard title="Orders" value={orders.length} icon={ShoppingBag} color="bg-blue-500" />
        <StatCard title="Active Drivers" value={activeDrivers.length} icon={Truck} color="bg-purple-500" />
        <StatCard title="Pending Orders" value={pendingOrders.length} icon={Clock} color="bg-orange-500" />
      </div>

      {/* Mobile Tabs */}
      <div className="sm:hidden overflow-x-auto pb-2 mb-4">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <MobileTabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => handleTabClick(tab)}
              badge={tab.id === 'drivers' ? pendingDrivers.length : tab.id === 'orders' ? pendingOrders.length : 0}
            />
          ))}
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden sm:flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <DesktopTabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => handleTabClick(tab)}
            badge={tab.id === 'drivers' ? pendingDrivers.length : tab.id === 'orders' ? pendingOrders.length : 0}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border p-3 sm:p-5">
        {activeTab === 'overview' && <AdminStats orders={orders} users={users} />}
        {activeTab === 'orders' && <AdminOrders orders={orders} drivers={drivers} onRefresh={refreshAll} />}
        {activeTab === 'restaurants' && <AdminRestaurants restaurants={restaurants} onRefresh={refreshAll} />}
        {activeTab === 'menu' && <AdminMenuItems restaurants={restaurants} />}
        {activeTab === 'users' && <AdminUsers users={users} />}
        
        {activeTab === 'finance' && (
          <div className="space-y-4">
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-3 pb-3 border-b">
              <Button onClick={exportOrdersToCSV} className="bg-green text-white">
                <Download className="w-4 h-4 mr-2" />
                Export Orders (CSV)
              </Button>
              <Button onClick={exportRevenueSummary} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Revenue Summary
              </Button>
            </div>

            {/* Revenue Overview */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-lg font-bold mb-4">Revenue Overview</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="text-2xl font-bold text-green">R{totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Today's Revenue</span>
                  <span className="text-lg font-semibold">R{todayRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="text-lg font-semibold">{completionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Order Value</span>
                  <span className="text-lg font-semibold">R{averageOrderValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Order Statistics */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-lg font-bold mb-4">Order Statistics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Orders</span>
                  <span className="font-semibold">{orders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed</span>
                  <span className="font-semibold text-green">{completedOrders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending</span>
                  <span className="font-semibold text-yellow-600">{pendingOrders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cancelled</span>
                  <span className="font-semibold text-red-500">
                    {orders.filter(o => o.status === 'cancelled').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="text-lg font-bold mb-4">Additional Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Delivery Fees</p>
                  <p className="text-xl font-bold text-blue-600">
                    R{orders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Driver Earnings</p>
                  <p className="text-xl font-bold text-purple-600">
                    R{orders.reduce((sum, o) => sum + (Number(o.driver_earning) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && <AdminSettings />}
        
        {activeTab === 'drivers' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold">{drivers.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-green">{activeDrivers.length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-yellow-600">{pendingDrivers.length}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>

            {/* Pending Drivers */}
            {pendingDrivers.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Pending Approval ({pendingDrivers.length})</h3>
                <div className="space-y-2">
                  {pendingDrivers.map(driver => (
                    <div key={driver.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedDriver(driver); setShowDocuments(true); }} className="p-1.5 bg-blue-500 text-white rounded text-xs">Review</button>
                        <button onClick={() => approveDriver(driver)} className="p-1.5 bg-green text-white rounded text-xs">Approve</button>
                        <button onClick={() => rejectDriver(driver)} className="p-1.5 bg-red-500 text-white rounded text-xs">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Drivers */}
            {activeDrivers.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Active Drivers</h3>
                <div className="space-y-2">
                  {activeDrivers.map(driver => (
                    <div key={driver.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.email}</p>
                      </div>
                      <span className="text-xs text-green">● Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver Documents Modal */}
      {showDocuments && selectedDriver && (
        <DriverDocuments
          driver={selectedDriver}
          onClose={() => { setShowDocuments(false); setSelectedDriver(null); }}
          onApprove={() => approveDriver(selectedDriver)}
          onReject={() => rejectDriver(selectedDriver)}
        />
      )}
    </div>
  );
}