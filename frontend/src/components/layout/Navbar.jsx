import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import {
  ShoppingBag,
  LogOut,
  Home,
  Truck,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Package,
  Bell,
  User,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { getTotalItems, total } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [unreadOrders, setUnreadOrders] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const totalItems = getTotalItems?.() || 0;
  const cartTotal = typeof total === 'function' ? total() : total || 0;

  const isActive = (path) => location.pathname === path;

  // Check user roles
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';
  const isCustomer = user?.role === 'customer';

  // ---------------- NAV LINKS ----------------
  const navLinks = [
    // Home - visible to everyone (including drivers)
    // { path: '/', label: 'Home', icon: Home, show: true },
    // Cart - only for customers (drivers and admins shouldn't order)
    { path: '/cart', label: 'Cart', icon: ShoppingBag, show: isCustomer, badge: totalItems },
    // Orders - only for customers
    { path: '/orders', label: 'Orders', icon: Package, show: isCustomer },
    // Driver dashboard - only for drivers
    { path: '/driver', label: 'Driver', icon: Truck, show: isDriver },
    // Admin dashboard - only for admins
    { path: '/admin', label: 'Admin', icon: LayoutDashboard, show: isAdmin },
  ];

  // ---------------- FETCH UNREAD ORDERS (only for customers) ----------------
  useEffect(() => {
    if (!isAuthenticated || !isCustomer || !user?.email) return;

    const fetchUnread = async () => {
      try {
        const orders = await base44.entities.Order.filter({
          customer_email: user.email,
        });

        const unread = orders.filter(
          (o) => o.status !== 'delivered' && o.status !== 'cancelled'
        );

        setUnreadOrders(unread.length);
        setNotifications(unread.slice(0, 5));
      } catch (err) {
        console.log(err);
      }
    };

    fetchUnread();

    const unsub = base44.entities.Order.subscribe?.(() => {
      fetchUnread();
    });

    return () => unsub?.();
  }, [isAuthenticated, isCustomer, user]);

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    navigate('/');
  };

  // ---------------- UI ----------------
  return (
    <>
      {/* NAVBAR */}
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">

            {/* LOGO */}
            <Link to={isAdmin ? '/admin' : '/'} className="text-xl font-bold text-green flex items-center gap-2">
              🍔 Lloyd's
              {isAdmin && <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded">Admin</span>}
              {isDriver && <span className="text-xs bg-green/20 text-green px-2 py-0.5 rounded">Driver</span>}
            </Link>

            {/* DESKTOP NAV */}
            <div className="hidden md:flex items-center gap-6">

              {navLinks.map((link) => {
                if (!link.show) return null;
                const Icon = link.icon;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative flex items-center gap-2 px-2 py-2 transition ${
                      isActive(link.path)
                        ? 'text-green border-b-2 border-green'
                        : 'hover:text-green'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}

                    {link.badge > 0 && (
                      <span className="absolute -top-1 -right-2 bg-green text-navy text-xs w-5 h-5 flex items-center justify-center rounded-full">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* CART TOTAL - only for customers */}
              {isCustomer && totalItems > 0 && (
                <div className="text-sm text-green font-semibold">
                  R{cartTotal.toFixed(2)}
                </div>
              )}

              {/* NOTIFICATIONS - only for customers */}
              {isCustomer && (
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 hover:text-green transition"
                  >
                    <Bell className="w-5 h-5" />

                    {unreadOrders > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadOrders}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white text-black rounded-lg shadow-xl z-50">
                      <div className="p-3 border-b font-semibold">Notifications</div>
                      {notifications.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No updates</div>
                      ) : (
                        notifications.map((n, i) => (
                          <div
                            key={i}
                            className="p-3 border-b text-sm hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate('/orders');
                            }}
                          >
                            <p className="font-medium">{n.restaurant_name}</p>
                            <p className="text-xs text-gray-500">Status: {n.status}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* USER MENU */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:text-green transition"
                  >
                    <div className="w-8 h-8 bg-green text-navy rounded-full flex items-center justify-center font-bold">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <span className="hidden lg:inline">{user?.name?.split(' ')[0] || 'User'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="p-3 border-b">
                          <p className="font-semibold">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            isAdmin ? 'bg-purple-100 text-purple-700' :
                            isDriver ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {isAdmin ? 'Administrator' : isDriver ? 'Delivery Driver' : 'Customer'}
                          </span>
                        </div>

                        {/* Profile - available to all authenticated users */}
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </Link>
                        )}

                        {isDriver && (
                          <Link
                            to="/driver"
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Truck className="w-4 h-4" />
                            Driver Portal
                          </Link>
                        )}

                        {isCustomer && (
                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Package className="w-4 h-4" />
                            My Orders
                          </Link>
                        )}

                        <div className="border-t">
                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-green text-navy px-5 py-2 rounded-lg font-semibold hover:bg-green/90 transition"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-navy/80 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bg-navy text-white z-40 md:hidden animate-slideDown">
            <div className="p-4 space-y-2">
              {/* <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                <Home className="w-5 h-5" /> Home
              </Link> */}
              
              {isCustomer && (
                <>
                  <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                    <ShoppingBag className="w-5 h-5" /> Cart
                    {totalItems > 0 && <span className="ml-auto bg-green text-navy px-2 rounded-full text-xs">{totalItems}</span>}
                  </Link>
                  <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                    <Package className="w-5 h-5" /> Orders
                  </Link>
                </>
              )}

              {isDriver && (
                <Link to="/driver" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                  <Truck className="w-5 h-5" /> Driver Dashboard
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                  <LayoutDashboard className="w-5 h-5" /> Admin Dashboard
                </Link>
              )}

              {/* Profile for all authenticated users */}
              {isAuthenticated && (
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy/80 transition">
                  <User className="w-5 h-5" /> My Profile
                </Link>
              )}

              <div className="border-t border-navy/30 pt-2">
                {isAuthenticated ? (
                  <button onClick={handleLogout} className="w-full text-left p-3 text-red-400 hover:bg-navy/80 rounded-lg transition">
                    Logout
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block bg-green text-navy p-3 rounded-lg text-center font-semibold">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}