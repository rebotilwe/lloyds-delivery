import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  LayoutDashboard, ShoppingBag, Store, Users, Truck,
  Settings, LogOut, Bell, Menu, X, ChevronDown,
  UtensilsCrossed, DollarSign, AlertCircle, UserCheck,
  Package, CheckCircle, Clock, XCircle, Eye, Home, User,
  CreditCard, Banknote, MessageCircle  // ← Add MessageCircle here
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const navItems = [
  { path: '/admin',             label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { path: '/admin/orders',      label: 'Orders',         icon: ShoppingBag },
  { path: '/admin/restaurants', label: 'Restaurants',    icon: Store },
  { path: '/admin/menu',        label: 'Menu',           icon: UtensilsCrossed },
  { path: '/admin/vendors',     label: 'Vendors',        icon: UserCheck },
  { path: '/admin/drivers',     label: 'Drivers',        icon: Truck },
  { path: '/admin/users',       label: 'Users',          icon: Users },
  { path: '/admin/finance',     label: 'Finance',        icon: DollarSign },
  { path: '/admin/support', label: 'Support Tickets', icon: MessageCircle },
  { path: '/admin/disputes',    label: 'Disputes',       icon: AlertCircle },
  { path: '/admin/driver-payouts', label: 'Driver Payouts', icon: Truck, color: 'text-blue-500' },
  { path: '/admin/vendor-payouts', label: 'Vendor Payouts', icon: Store, color: 'text-purple-500' },
  { path: '/admin/settings',    label: 'Settings',       icon: Settings },
];

const notifIcon = (type) => {
  const map = {
    order_placed:    <Package className="h-4 w-4 text-blue-500" />,
    order_status:    <Clock className="h-4 w-4 text-amber-500" />,
    order_delivered: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    order_cancelled: <XCircle className="h-4 w-4 text-red-500" />,
  };
  return map[type] ?? <Bell className="h-4 w-4 text-slate-400" />;
};

function NavLink({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, online } = useSocket();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const unread = notifs.filter(n => !n.read).length;

  // Persist notifications
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_notifs');
      if (saved) {
        const parsed = JSON.parse(saved).slice(0, 50);
        setNotifs(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_notifs', JSON.stringify(notifs));
  }, [notifs]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !online) return;
    const add = (n) => setNotifs(prev => [n, ...prev].slice(0, 50));

    const onNewOrder = (data) => {
      add({ id: Date.now(), type: 'order_placed', title: 'New Order',
        message: `#${data.orderId} · ${data.restaurantName}`,
        timestamp: new Date().toISOString(), read: false, orderId: data.orderId });
      toast.info(`New order #${data.orderId}`, {
        action: { label: 'View', onClick: () => navigate('/admin/orders') },
      });
    };
    const onStatus = (data) => {
      add({ id: Date.now(), type: 'order_status', title: 'Order Updated',
        message: `#${data.orderId} → ${data.status?.replace(/_/g, ' ')}`,
        timestamp: new Date().toISOString(), read: false, orderId: data.orderId });
    };

    socket.on('new-order', onNewOrder);
    socket.on('order-status-update', onStatus);
    return () => { socket.off('new-order', onNewOrder); socket.off('order-status-update', onStatus); };
  }, [socket, online, navigate]);

  // Close sidebar on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isActive = useCallback((item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path),
  [location.pathname]);

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const initials = (user?.full_name || user?.name || 'A').charAt(0).toUpperCase();
  const firstName = user?.full_name?.split(' ')[0] || user?.name || 'Admin';
  const pageLabel = navItems.find(i => isActive(i))?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* ── Backdrop (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200 bg-white',
        'transition-transform duration-200 lg:static lg:translate-x-0',
        open ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      )}>
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-sm">🍔</span>
            <span className="text-sm font-bold tracking-tight">Lloyd's Admin</span>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-slate-100 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-0.5">
            {navItems.map(item => (
              <NavLink key={item.path} item={item} active={isActive(item)} onClick={() => setOpen(false)} />
            ))}
          </nav>
        </ScrollArea>

        {/* User + logout */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{firstName}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">{pageLabel}</h1>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  online ? 'bg-emerald-500' : 'bg-red-400'
                )} />
                <span className="text-[10px] text-slate-400">{online ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">

            {/* Notifications */}
            <DropdownMenu open={showNotifs} onOpenChange={setShowNotifs}>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-lg p-2 hover:bg-slate-100 transition-colors">
                  <Bell className="h-4 w-4 text-slate-600" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-600">
                      Mark all read
                    </button>
                  )}
                </div>
                <ScrollArea className="h-72">
                  {notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Bell className="mb-2 h-8 w-8 text-slate-200" />
                      <p className="text-xs text-slate-400">No notifications yet</p>
                    </div>
                  ) : notifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                      className={cn(
                        'flex cursor-pointer gap-3 border-b px-4 py-3 hover:bg-slate-50 transition-colors',
                        !n.read && 'bg-blue-50/60'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{n.title}</p>
                        <p className="text-xs text-slate-500 truncate">{n.message}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{timeAgo(n.timestamp)}</span>
                          {n.orderId && (
                            <button
                              onClick={e => { e.stopPropagation(); setShowNotifs(false); navigate('/admin/orders'); }}
                              className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600"
                            >
                              <Eye className="h-3 w-3" /> View
                            </button>
                          )}
                        </div>
                      </div>
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                    </div>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {initials}
                  </div>
                  <span className="hidden text-sm font-medium text-slate-700 md:inline">{firstName}</span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-normal text-slate-500">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer text-sm">
                  <User className="mr-2 h-3.5 w-3.5" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer text-sm">
                  <Home className="mr-2 h-3.5 w-3.5" /> Visit site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { logout(); navigate('/login'); }}
                  className="cursor-pointer text-sm text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Page content — scrolls independently */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}