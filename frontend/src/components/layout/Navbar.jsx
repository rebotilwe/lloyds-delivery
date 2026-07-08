import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { useSocket } from '@/context/SocketContext';
import {
  ShoppingCart, Menu, X, Home, Package, User, LogOut,
  ShoppingBag, Truck, Store, LayoutDashboard, Bell,
  HelpCircle, Phone, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const cartCount = getTotalItems();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Real-time order notifications via socket
  useEffect(() => {
    if (!socket || !user) return;
    const handle = (data) => {
      const msg = `Order #${data.orderId} is now ${(data.status || '').replace(/_/g, ' ')}`;
      setNotifications(prev => [{ id: Date.now(), msg, time: new Date() }, ...prev.slice(0, 9)]);
    };
    socket.on('order-status-update', handle);
    return () => socket.off('order-status-update', handle);
  }, [socket, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  // ── Nav links ──────────────────────────────────────────────────────────
  const publicLinks = [
    { to: '/',        label: 'Home',    icon: Home       },
    { to: '/help',    label: 'Help',    icon: HelpCircle }, // ← added
    { to: '/contact', label: 'Contact', icon: Phone      },
  ];

  const customerLinks = user?.role === 'customer' ? [
    { to: '/orders',  label: 'My Orders', icon: ShoppingBag },
    { to: '/profile', label: 'Profile',   icon: User        },
  ] : [];

  const roleLink = () => {
    if (!user) return null;
    if (user.role === 'driver') return { to: '/driver', label: 'Driver Dashboard', icon: Truck };
    if (user.role === 'vendor') return { to: '/vendor', label: 'Vendor Dashboard', icon: Store };
    if (user.role === 'admin')  return { to: '/admin',  label: 'Admin Dashboard',  icon: LayoutDashboard };
    return null;
  };

  const allNavLinks = [
    ...publicLinks,
    ...customerLinks,
    ...(roleLink() ? [roleLink()] : []),
  ];

  // Mobile bottom nav — max 5 + cart always pinned right
  const bottomNavLinks = [
    { to: '/',       label: 'Home',    icon: Home       },
    { to: '/help',   label: 'Help',    icon: HelpCircle }, // ← added
    ...(user
      ? [{ to: '/orders',  label: 'Orders',  icon: ShoppingBag }]
      : [{ to: '/contact', label: 'Contact', icon: Phone       }]
    ),
    ...(user?.role === 'driver'   ? [{ to: '/driver', label: 'Drive',   icon: Truck          }] : []),
    ...(user?.role === 'vendor'   ? [{ to: '/vendor', label: 'Store',   icon: Store          }] : []),
    ...(user?.role === 'admin'    ? [{ to: '/admin',  label: 'Admin',   icon: LayoutDashboard}] : []),
    ...(user?.role === 'customer' ? [{ to: '/profile',label: 'Profile', icon: User           }] : []),
  ].slice(0, 5);

  return (
    <>
      {/* ── Top Navbar ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-green rounded-xl flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Lloyds Delivery</span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            {allNavLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(link.to)
                    ? 'bg-green/10 text-green'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Cart */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">Notifications</p>
                      {notifications.length > 0 && (
                        <button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-gray-600">
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="px-4 py-3">
                            <p className="text-sm text-gray-700">{n.msg}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{n.time.toLocaleTimeString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop auth */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-gray-500 max-w-[100px] truncate">{user.name}</span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-green text-white text-xs">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
            {allNavLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive(link.to) ? 'bg-green/10 text-green' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="w-4 h-4" /> Logout ({user.name})
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-sm">Login</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button size="sm" className="w-full bg-green text-white text-sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around h-14">
          {bottomNavLinks.map(link => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition"
              >
                <link.icon className={`w-5 h-5 ${active ? 'text-green' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-medium ${active ? 'text-green' : 'text-gray-400'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
          {/* Cart pinned right */}
          <Link
            to="/cart"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
          >
            <div className="relative">
              <ShoppingCart className={`w-5 h-5 ${isActive('/cart') ? 'text-green' : 'text-gray-400'}`} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${isActive('/cart') ? 'text-green' : 'text-gray-400'}`}>
              Cart
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}