import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/cartStore';
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  Home, 
  Truck, 
  LayoutDashboard, 
  Menu, 
  X,
  ChevronDown,
  Package
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { getTotalItems, total } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Safely get total items
  const totalItems = typeof getTotalItems === 'function' ? getTotalItems() : 0;
  const cartTotal = typeof total === 'function' ? total() : (total || 0);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: Home, showWhen: 'always' },
    { path: '/cart', label: 'Cart', icon: ShoppingBag, showWhen: 'always', badge: totalItems },
    { path: '/orders', label: 'Orders', icon: Package, showWhen: 'authenticated' },
    { path: '/driver', label: 'Driver', icon: Truck, showWhen: 'role:driver' },
    { path: '/admin', label: 'Admin', icon: LayoutDashboard, showWhen: 'role:admin' },
  ];

  const shouldShowLink = (link) => {
    if (link.showWhen === 'always') return true;
    if (link.showWhen === 'authenticated') return isAuthenticated;
    if (link.showWhen === 'role:driver') return isAuthenticated && user?.role === 'driver';
    if (link.showWhen === 'role:admin') return isAuthenticated && user?.role === 'admin';
    return false;
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="text-xl md:text-2xl font-bold text-green flex items-center gap-2 hover:opacity-90 transition">
              <span className="text-2xl">🍔</span>
              <span className="hidden sm:inline">Lloyd's Delivery</span>
              <span className="sm:hidden">Lloyd's</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                if (!shouldShowLink(link)) return null;
                const Icon = link.icon;
                const active = isActive(link.path);
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative flex items-center gap-2 px-2 py-2 transition-all duration-200 ${
                      active 
                        ? 'text-green border-b-2 border-green' 
                        : 'hover:text-green'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                    {link.badge > 0 && (
                      <span className="absolute -top-1 -right-2 bg-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Cart total (desktop) */}
              {totalItems > 0 && (
                <div className="text-sm text-green font-semibold">
                  R{cartTotal.toFixed(2)}
                </div>
              )}

              {/* User Menu (Desktop) */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:text-green transition px-3 py-2 rounded-lg hover:bg-navy/80"
                  >
                    <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center text-navy font-semibold">
                      {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <span className="hidden lg:inline">{user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            user?.role === 'admin' ? 'bg-red-100 text-red-700' :
                            user?.role === 'driver' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                          </span>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-green text-navy px-5 py-2 rounded-lg hover:bg-green-600 transition font-semibold hover:shadow-lg"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-navy/80 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-navy text-white z-40 md:hidden animate-slideDown">
            <div className="flex flex-col p-4 space-y-2">
              {navLinks.map((link) => {
                if (!shouldShowLink(link)) return null;
                const Icon = link.icon;
                const active = isActive(link.path);
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      active 
                        ? 'bg-green text-navy' 
                        : 'hover:bg-navy/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{link.label}</span>
                    </div>
                    {link.badge > 0 && (
                      <span className="bg-yellow-500 text-navy px-2 py-0.5 rounded-full text-xs font-bold">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {isAuthenticated ? (
                <>
                  <div className="border-t border-navy/30 my-2 pt-2">
                    <div className="px-4 py-2">
                      <p className="font-semibold">{user?.full_name}</p>
                      <p className="text-sm text-green">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-navy/80 transition text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-green text-navy px-4 py-3 rounded-lg text-center font-semibold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Add this to your global CSS or tailwind config for the animation
// @keyframes slideDown {
//   from { transform: translateY(-100%); opacity: 0; }
//   to { transform: translateY(0); opacity: 1; }
// }
// .animate-slideDown {
//   animation: slideDown 0.3s ease-out;
// }