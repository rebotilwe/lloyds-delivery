import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/drivers', label: 'Drivers', icon: Truck },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

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
        {/* Sidebar - Mobile friendly */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-full flex-col">
            {/* Logo Area */}
            <div className="flex items-center justify-between px-5 py-5 border-b">
              <Link to="/admin" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  🍔
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Lloyd's Admin</p>
                  <p className="text-xs text-slate-500">Management console</p>
                </div>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="mx-4 mt-5 rounded-xl bg-slate-900 px-4 py-4 text-white">
              <p className="text-xs text-white/70">Signed in as</p>
              <p className="mt-1 font-semibold truncate">{user?.full_name || user?.name || 'Admin'}</p>
              <p className="text-xs text-white/60 truncate">{user?.email || ''}</p>
            </div>

            {/* Navigation */}
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
                className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-h-screen flex-1">
          {/* Header - Mobile friendly */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-lg border bg-white p-2 shadow-sm hover:bg-slate-50 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold tracking-tight lg:text-xl">Admin Dashboard</h1>
                  <p className="hidden text-sm text-slate-500 lg:block">Manage your platform operations</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications */}
                <button className="relative rounded-lg border bg-white p-2 shadow-sm hover:bg-slate-50">
                  <Bell className="h-5 w-5 text-slate-600" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"></span>
                </button>

                {/* User Menu */}
                <div className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 shadow-sm lg:px-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {user?.full_name?.[0] || user?.name?.[0] || 'A'}
                  </div>
                  <span className="hidden text-sm font-medium text-slate-700 md:inline">
                    {user?.full_name?.split(' ')[0] || user?.name || 'Admin'}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
                </div>
              </div>
            </div>

            {/* Mobile Title (visible only on small screens) */}
            <div className="block border-t px-4 py-2 sm:hidden">
              <h1 className="text-base font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-slate-500">Manage your platform</p>
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