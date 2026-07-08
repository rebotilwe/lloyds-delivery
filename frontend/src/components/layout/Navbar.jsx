import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { useSocket } from '@/context/SocketContext';
import {
  ShoppingCart, Menu, X, Home, User, LogOut,
  ShoppingBag, Truck, Store, LayoutDashboard, Bell, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/logo.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, online } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const cartCount = getTotalItems();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('order-status-update', (data) => {
      const message = `Order #${data.orderId} status: ${(data.status || '').replace(/_/g, ' ')}`;
      setNotifications(prev => [
        { id: Date.now(), message, time: new Date(), orderId: data.orderId },
        ...prev.slice(0, 9)
      ]);
    });

    if (user.role === 'vendor') {
      socket.on('new-order', (data) => {
        setNewOrderAlert(data);
        setTimeout(() => setNewOrderAlert(null), 5000);
        setNotifications(prev => [
          { id: Date.now(), message: `New order #${data.orderId} received! R${data.orderTotal}`, time: new Date() },
          ...prev.slice(0, 9)
        ]);
      });
    }

    return () => {
      socket.off('order-status-update');
      socket.off('new-order');
    };
  }, [socket, user]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'admin')  return { to: '/admin',  label: 'Admin',  icon: LayoutDashboard };
    if (user.role === 'driver') return { to: '/driver', label: 'Drive',  icon: Truck           };
    if (user.role === 'vendor') return { to: '/vendor', label: 'Vendor', icon: Store           };
    return null;
  };

  const dashboardLink = getDashboardLink();

  const navLinks = [
    { to: '/help', label: 'Help', icon: HelpCircle },
    ...(user?.role === 'customer' ? [
      { to: '/orders',  label: 'Orders',  icon: ShoppingBag },
      { to: '/profile', label: 'Profile', icon: User        },
    ] : []),
    ...(dashboardLink ? [dashboardLink] : []),
  ];

  const mobileBottomLinks = [
    { to: '/help', label: 'Help', icon: HelpCircle },
    ...(user?.role === 'customer' ? [
      { to: '/orders',  label: 'Orders',  icon: ShoppingBag },
      { to: '/profile', label: 'Profile', icon: User        },
    ] : []),
    ...(dashboardLink ? [dashboardLink] : []),
  ].slice(0, 4);

  return (
    <>
      {/* ── New Order Alert (vendors) ── */}
      {newOrderAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          🎉 New order received! R{newOrderAlert.orderTotal}
        </div>
      )}

      {/* ── Navbar — navy brand colour matches the logo ── */}
      <header className="sticky top-0 z-40 shadow-lg border-b border-[#162f4a]" style={{ backgroundColor: '#1B3A5C' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          {/* Logo — Lloyd's Delivery brand logo from assets */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white rounded-xl p-1 flex items-center justify-center">
              <img
                src={logo}
                alt="Lloyd's Delivery"
                className="h-14 w-auto object-contain"
              />
            </div>
            <span className="font-bold text-white hidden sm:block tracking-wide">Lloyd's Delivery</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(link.to)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
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
            <Link to="/cart" className="relative p-2 hover:bg-white/10 rounded-lg transition">
              <ShoppingCart className="w-5 h-5 text-white/80 hover:text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <Bell className="w-5 h-5 text-white/80 hover:text-white" />
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
                            <p className="text-sm text-gray-700">{n.message}</p>
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
                <span className="text-xs text-white/60 max-w-[100px] truncate">{user.name}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="text-xs border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs border-white/30 text-white hover:bg-white/10">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" style={{ backgroundColor: '#5B8C6E' }} className="text-white text-xs hover:opacity-90">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition"
            >
              {mobileMenuOpen ? 
                <X className="w-5 h-5 text-white" /> : 
                <Menu className="w-5 h-5 text-white" />
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 space-y-1" style={{ backgroundColor: '#1B3A5C' }}>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive(link.to) 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 w-full"
                >
                  <LogOut className="w-4 h-4" /> Logout ({user.name})
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button size="sm" style={{ backgroundColor: '#5B8C6E' }} className="w-full text-white hover:opacity-90">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Bottom Nav — navy to match header ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 shadow-lg" style={{ backgroundColor: '#1B3A5C' }}>
        <div className="flex items-center justify-around h-14">
          {mobileBottomLinks.map(link => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              >
                <link.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white/50'}`} />
                <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-white/50'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
          {/* Cart always pinned right */}
          <Link to="/cart" className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
            <div className="relative">
              <ShoppingCart className={`w-5 h-5 ${isActive('/cart') ? 'text-white' : 'text-white/50'}`} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${isActive('/cart') ? 'text-white' : 'text-white/50'}`}>
              Cart
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}