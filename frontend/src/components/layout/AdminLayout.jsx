import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Truck,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Home,
  UtensilsCrossed,
  DollarSign,
  AlertCircle,
  UserCheck,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Updated admin navigation with all routes
const adminNavItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { path: '/admin/menu', label: 'Menu Items', icon: UtensilsCrossed },
  { path: '/admin/vendors', label: 'Vendors', icon: UserCheck },
  { path: '/admin/drivers', label: 'Drivers', icon: Truck },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/finance', label: 'Finance', icon: DollarSign },
  { path: '/admin/disputes', label: 'Disputes', icon: AlertCircle },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/payouts', label: 'Driver Payouts', icon: DollarSign },
];

// Notification types
const getNotificationIcon = (type) => {
  switch (type) {
    case 'order_placed':
      return <Package className="w-4 h-4 text-blue-500" />;
    case 'order_status':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'order_delivered':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'order_cancelled':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, online } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileView, setMobileView] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const limited = parsed.slice(0, 50);
        setNotifications(limited);
        setUnreadCount(limited.filter(n => !n.read).length);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Listen for socket events
  useEffect(() => {
    if (socket && online) {
      const handleNewOrder = (data) => {
        const newNotification = {
          id: Date.now(),
          type: 'order_placed',
          title: 'New Order Received',
          message: `Order #${data.orderId} from ${data.restaurantName}`,
          timestamp: new Date().toISOString(),
          read: false,
          orderId: data.orderId,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        if (mobileView && 'vibrate' in navigator) {
          navigator.vibrate(200);
        }
        toast.info(`📦 New order #${data.orderId} received!`, {
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => navigate('/admin/orders'),
          },
        });
      };

      const handleOrderStatusUpdate = (data) => {
        const newNotification = {
          id: Date.now(),
          type: 'order_status',
          title: 'Order Status Updated',
          message: `Order #${data.orderId} status changed to ${data.status?.replace(/_/g, ' ')}`,
          timestamp: new Date().toISOString(),
          read: false,
          orderId: data.orderId,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
      };

      socket.on('new-order', handleNewOrder);
      socket.on('order-status-update', handleOrderStatusUpdate);

      return () => {
        socket.off('new-order', handleNewOrder);
        socket.off('order-status-update', handleOrderStatusUpdate);
      };
    }
  }, [socket, online, navigate, mobileView]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const isActive = useCallback((item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  }, [location.pathname]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  }, []);

  const clearNotifications = useCallback(() => {
    if (window.confirm('Clear all notifications? This action cannot be undone.')) {
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Notifications cleared');
    }
  }, []);

  const viewOrder = useCallback((orderId) => {
    setShowNotifications(false);
    navigate(`/admin/orders`);
  }, [navigate]);

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }, []);

  const getUserInitials = useCallback(() => {
    const name = user?.full_name || user?.name || 'Admin';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const getUserName = useCallback(() => {
    return user?.full_name?.split(' ')[0] || user?.name || 'Admin';
  }, [user]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-full flex-col">
            {/* Logo Area */}
            <div className="flex items-center justify-between px-5 py-5 border-b">
              <Link to="/admin" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md transition-transform group-hover:scale-105">
                  <span className="text-xl">🍔</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Lloyd's Admin</p>
                  <p className="text-xs text-slate-500">Management console</p>
                </div>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors lg:hidden"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="mx-4 mt-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-4 text-white shadow-lg">
              <p className="text-xs text-white/70">Signed in as</p>
              <p className="mt-1 font-semibold truncate text-sm">{user?.full_name || user?.name || 'Admin'}</p>
              <p className="text-xs text-white/60 truncate mt-0.5">{user?.email || ''}</p>
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-[10px] text-white/50">Admin Access</p>
              </div>
            </div>

            {/* Navigation - Now includes all pages */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {adminNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={isActive(item)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition-all hover:bg-rose-100 hover:border-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-h-screen flex-1">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-lg border bg-white p-2 shadow-sm hover:bg-slate-50 transition-colors lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold tracking-tight lg:text-xl">Admin Dashboard</h1>
                  <p className="hidden text-sm text-slate-500 lg:block">Manage your platform operations</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Connection Status */}
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-slate-600">{online ? 'Live' : 'Offline'}</span>
                </div>

                {/* Notifications Dropdown */}
                <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                  <DropdownMenuTrigger asChild>
                    <button className="relative rounded-lg border bg-white p-2 shadow-sm hover:bg-slate-50 transition-colors">
                      <Bell className="h-5 w-5 text-slate-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[11px] font-medium text-white flex items-center justify-center shadow-md">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
                    <div className="flex items-center justify-between border-b p-3 sticky top-0 bg-white z-10">
                      <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
                      <div className="flex gap-2">
                        {notifications.length > 0 && (
                          <>
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                            >
                              Mark all read
                            </button>
                            <button
                              onClick={clearNotifications}
                              className="text-xs text-red-500 hover:text-red-600 transition-colors"
                            >
                              Clear all
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="h-96">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Bell className="h-12 w-12 text-gray-200 mb-3" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                          <p className="text-xs text-gray-400 mt-1">New orders will appear here</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "border-b p-3 cursor-pointer transition-all hover:bg-slate-50",
                              !notification.read && "bg-blue-50/50"
                            )}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-400">
                                    {formatTimestamp(notification.timestamp)}
                                  </p>
                                  {notification.orderId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewOrder(notification.orderId);
                                      }}
                                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                    >
                                      <Eye className="w-3 h-3" />
                                      View Order
                                    </button>
                                  )}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                    {notifications.length > 0 && (
                      <div className="border-t p-2 text-center bg-slate-50">
                        <p className="text-xs text-gray-400">
                          {unreadCount} unread · {notifications.length} total
                        </p>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 shadow-sm hover:bg-slate-50 transition-colors lg:px-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-semibold text-white shadow-md">
                        {getUserInitials()}
                      </div>
                      <span className="hidden text-sm font-medium text-slate-700 md:inline">
                        {getUserName()}
                      </span>
                      <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                      <Home className="mr-2 h-4 w-4" />
                      Visit Website
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile Title */}
            <div className="block border-t px-4 py-2 sm:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-semibold">Admin Dashboard</h1>
                  <p className="text-xs text-slate-500">Manage your platform</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] text-slate-500">{online ? 'Live' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}