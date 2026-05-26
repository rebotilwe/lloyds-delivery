import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VendorNotificationBell from '@/components/vendor/NotificationBell';

const vendorNavItems = [
  { path: '/vendor', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/vendor/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/vendor/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/vendor/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-green text-white shadow-lg"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function VendorLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    const name = user?.full_name || user?.name || 'Vendor';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center justify-between px-5 py-5 border-b">
              <Link to="/vendor" className="flex items-center gap-2">
                <span className="text-2xl">🍔</span>
                <span className="font-bold text-navy">Vendor Portal</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Vendor Info */}
            <div className="mx-4 mt-5 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 px-4 py-4">
              <p className="text-xs text-gray-500">Restaurant Owner</p>
              <p className="mt-1 font-semibold truncate text-sm">{user?.full_name || user?.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {vendorNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  active={isActive(item)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-all hover:bg-red-100"
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
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-lg border bg-white p-2 shadow-sm hover:bg-gray-50 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-semibold">Restaurant Dashboard</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <VendorNotificationBell />

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 shadow-sm hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green text-white text-sm font-semibold">
                      {getUserInitials()}
                    </div>
                    <span className="hidden text-sm font-medium text-gray-700 md:inline">
                      {user?.full_name?.split(' ')[0] || 'Vendor'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                        <div className="p-3 border-b bg-gray-50">
                          <p className="font-semibold text-sm">{user?.full_name || user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <Link
                          to="/vendor/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Profile Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}