import React, { useState, useEffect, useRef } from 'react';
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
  Store,
  Settings,
  HelpCircle,
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
  const [mobileView, setMobileView] = useState(false);
  
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  const [unreadOrders, setUnreadOrders] = useState(0);
  const [allActiveOrders, setAllActiveOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState(() => {
    const saved = localStorage.getItem('read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const totalItems = getTotalItems?.() || 0;
  const cartTotal = typeof total === 'function' ? total() : total || 0;

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  // Check user roles
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';
  const isCustomer = user?.role === 'customer';

  // ---------------- NAV LINKS ----------------
  const navLinks = [
    { path: '/cart', label: 'Cart', icon: ShoppingBag, show: isCustomer, badge: totalItems },
    { path: '/orders', label: 'Orders', icon: Package, show: isCustomer },
    { path: '/package-delivery', label: 'Send Package', icon: Package, show: isCustomer, color: 'text-purple-400' },
    { path: '/driver', label: 'Driver', icon: Truck, show: isDriver },
    { path: '/admin', label: 'Admin', icon: LayoutDashboard, show: isAdmin },
  ];

  // ---------------- FETCH NOTIFICATIONS ----------------
  useEffect(() => {
    if (!isAuthenticated || !isCustomer || !user?.email) return;

    const fetchUnread = async () => {
      try {
        const orders = await base44.entities.Order.filter({
          customer_email: user.email,
        });

        // Filter active orders (not delivered or cancelled)
        const activeOrders = orders.filter(
          (o) => o.status !== 'delivered' && o.status !== 'cancelled'
        );
        
        setAllActiveOrders(activeOrders);

        // Calculate unread count - compare active orders with read notifications
        const viewedOrders = JSON.parse(localStorage.getItem('viewed_orders') || '[]');
        // Also check read_notifications
        const readOrderIds = [...viewedOrders, ...readNotifications];
        const trulyUnread = activeOrders.filter(o => !readOrderIds.includes(o.id));
        
        setUnreadOrders(trulyUnread.length);
        // Show first 5 unread notifications, or if none, show any active orders
        if (trulyUnread.length > 0) {
          setNotifications(trulyUnread.slice(0, 5));
        } else {
          setNotifications(activeOrders.slice(0, 5));
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchUnread();

    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isCustomer, user, readNotifications]);

  // Mark notification as read
  const markAsRead = (orderId) => {
    // Add to read_notifications
    const updated = [...readNotifications, orderId];
    setReadNotifications(updated);
    localStorage.setItem('read_notifications', JSON.stringify(updated));
    
    // Also add to viewed_orders for compatibility
    const viewed = JSON.parse(localStorage.getItem('viewed_orders') || '[]');
    if (!viewed.includes(orderId)) {
      const updatedViewed = [...viewed, orderId];
      localStorage.setItem('viewed_orders', JSON.stringify(updatedViewed));
    }
    
    // Recalculate unread count
    const readOrderIds = [...updated, ...JSON.parse(localStorage.getItem('viewed_orders') || '[]')];
    const newUnread = allActiveOrders.filter(o => !readOrderIds.includes(o.id)).length;
    setUnreadOrders(newUnread);
  };

  // Mark all as read - mark ALL active orders as read
  const markAllAsRead = () => {
    const allActiveOrderIds = allActiveOrders.map(n => n.id);
    
    // Update read_notifications with ALL active order IDs
    const updated = [...new Set([...readNotifications, ...allActiveOrderIds])];
    setReadNotifications(updated);
    localStorage.setItem('read_notifications', JSON.stringify(updated));
    
    // Also update viewed_orders
    const viewed = JSON.parse(localStorage.getItem('viewed_orders') || '[]');
    const updatedViewed = [...new Set([...viewed, ...allActiveOrderIds])];
    localStorage.setItem('viewed_orders', JSON.stringify(updatedViewed));
    
    // Reset unread count to 0
    setUnreadOrders(0);
    
    // Update notifications display to show no unread
    setNotifications(allActiveOrders.slice(0, 5));
  };

  // Get unread notifications for display (only orders not in read list)
  const getUnreadNotifications = () => {
    const readOrderIds = [...readNotifications, ...(JSON.parse(localStorage.getItem('viewed_orders') || '[]'))];
    return allActiveOrders.filter(n => !readOrderIds.includes(n.id)).slice(0, 5);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    navigate('/');
  };

  // Format notification status
  const formatStatus = (status) => {
    const statusMap = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready_for_pickup: 'Ready for Pickup',
      picked_up: 'Picked Up',
      on_the_way: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      pending_approval: 'Pending Approval',
      pending_driver: 'Finding Driver',
      assigned: 'Driver Assigned',
    };
    return statusMap[status] || status;
  };

  const displayNotifications = getUnreadNotifications();
  const hasUnread = unreadOrders > 0;

  return (
    <>
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">

            {/* LOGO */}
            <Link 
              to={isAdmin ? '/admin' : '/'} 
              className="text-lg sm:text-xl font-bold text-green flex items-center gap-2 hover:opacity-80 transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="text-xl sm:text-2xl">🍔</span>
              <span className="hidden xs:inline">Lloyd's</span>
              {isAdmin && <span className="text-[10px] sm:text-xs bg-green/20 text-green px-1.5 py-0.5 rounded">Admin</span>}
              {isDriver && <span className="text-[10px] sm:text-xs bg-green/20 text-green px-1.5 py-0.5 rounded">Driver</span>}
            </Link>

            {/* DESKTOP NAV */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map((link) => {
                if (!link.show) return null;
                const Icon = link.icon;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative flex items-center gap-1.5 px-2 py-2 transition ${
                      isActive(link.path)
                        ? 'text-green border-b-2 border-green'
                        : `hover:text-green ${link.color || ''}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{link.label}</span>

                    {link.badge > 0 && (
                      <span className="absolute -top-1 -right-2 bg-green text-navy text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* CART TOTAL */}
              {isCustomer && totalItems > 0 && (
                <div className="text-sm text-green font-semibold bg-green/10 px-3 py-1 rounded-full">
                  R{cartTotal.toFixed(2)}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {isCustomer && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 hover:text-green transition rounded-lg hover:bg-white/10"
                  >
                    <Bell className="w-5 h-5" />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                        {unreadOrders > 99 ? '99+' : unreadOrders}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white text-black rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b font-semibold flex justify-between items-center">
                        <span>Notifications</span>
                        <div className="flex gap-2">
                          {hasUnread && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-xs text-green hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                          <button 
                            onClick={() => navigate('/orders')}
                            className="text-xs text-green hover:underline"
                          >
                            View all
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {displayNotifications.length === 0 ? (
                          <div className="p-6 text-center">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No new notifications</p>
                            {allActiveOrders.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                You have {allActiveOrders.length} active order{allActiveOrders.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        ) : (
                          displayNotifications.map((n) => (
                            <div
                              key={n.id}
                              className="p-3 border-b hover:bg-gray-50 cursor-pointer transition"
                              onClick={() => {
                                markAsRead(n.id);
                                setNotificationsOpen(false);
                                navigate('/orders');
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-green mt-1.5"></div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {n.delivery_type === 'package' ? '📦 Package Delivery' : n.restaurant_name || 'Food Order'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Status: <span className="font-medium">{formatStatus(n.status)}</span>
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    Order #{n.id}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* USER MENU */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:text-green transition px-2 py-1 rounded-lg hover:bg-white/10"
                  >
                    <div className="w-8 h-8 bg-green text-navy rounded-full flex items-center justify-center font-bold text-sm">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <span className="hidden lg:inline text-sm">{user?.name?.split(' ')[0] || 'User'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white text-black rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b bg-gray-50">
                        <p className="font-semibold text-sm">{user?.name || user?.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                          isAdmin ? 'bg-purple-100 text-purple-700' :
                          isDriver ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {isAdmin ? 'Administrator' : isDriver ? 'Delivery Driver' : 'Customer'}
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition"
                      >
                        <User className="w-4 h-4 text-gray-500" />
                        My Profile
                      </Link>

                      {isCustomer && (
                        <>
                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition"
                          >
                            <Package className="w-4 h-4 text-gray-500" />
                            My Orders (Food & Packages)
                          </Link>
                          <Link
                            to="/package-delivery"
                            onClick={() => setUserMenuOpen(false)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition border-t"
                          >
                            <Package className="w-4 h-4 text-purple-500" />
                            Send a Package
                          </Link>
                        </>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-500" />
                          Admin Dashboard
                        </Link>
                      )}

                      {isDriver && (
                        <Link
                          to="/driver"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition"
                        >
                          <Truck className="w-4 h-4 text-gray-500" />
                          Driver Dashboard
                        </Link>
                      )}

                      <div className="border-t">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-green text-navy px-4 py-2 rounded-lg font-semibold hover:bg-green/90 transition text-sm"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU - same as before */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-14 left-0 right-0 bg-navy text-white z-40 md:hidden shadow-xl animate-slideDown max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="p-3 space-y-1">
              {isAuthenticated && (
                <div className="p-3 mb-2 bg-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green text-navy rounded-full flex items-center justify-center font-bold">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{user?.name || user?.full_name}</p>
                      <p className="text-xs text-gray-300 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {isCustomer && (
                <>
                  <Link 
                    to="/package-delivery" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
                  >
                    <Package className="w-5 h-5 text-purple-400" /> 
                    <span>Send a Package</span>
                  </Link>
                  <Link 
                    to="/cart" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-5 h-5" /> 
                      <span>Cart</span>
                    </div>
                    {totalItems > 0 && (
                      <span className="bg-green text-navy px-2 rounded-full text-xs font-semibold">{totalItems}</span>
                    )}
                  </Link>
                  <Link 
                    to="/orders" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
                  >
                    <Package className="w-5 h-5" /> 
                    <span>My Orders</span>
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">{unreadOrders}</span>
                    )}
                  </Link>
                </>
              )}

              {isDriver && (
                <Link 
                  to="/driver" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
                >
                  <Truck className="w-5 h-5" /> 
                  <span>Driver Dashboard</span>
                </Link>
              )}

              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
                >
                  <LayoutDashboard className="w-5 h-5" /> 
                  <span>Admin Dashboard</span>
                </Link>
              )}

              {isAuthenticated && (
                <Link 
                  to="/profile" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
                >
                  <User className="w-5 h-5" /> 
                  <span>My Profile</span>
                </Link>
              )}

              <Link 
                to="/contact" 
                onClick={() => setMobileMenuOpen(false)} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"
              >
                <HelpCircle className="w-5 h-5" /> 
                <span>Help & Support</span>
              </Link>

              <div className="border-t border-white/10 my-2 pt-2">
                {isAuthenticated ? (
                  <button 
                    onClick={handleLogout} 
                    className="w-full text-left p-3 text-red-400 hover:bg-white/10 rounded-lg transition flex items-center gap-3"
                  >
                    <LogOut className="w-5 h-5" /> 
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="block bg-green text-navy p-3 rounded-lg text-center font-semibold hover:bg-green/90 transition"
                  >
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