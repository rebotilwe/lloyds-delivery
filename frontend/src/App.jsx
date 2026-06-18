import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SocketProvider } from '@/context/SocketContext';
import { Clock } from 'lucide-react';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/cartStore';
import { api } from '@/api/client';

import AppLayout from '@/components/layout/AppLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import VendorLayout from '@/components/layout/VendorLayout';

import Home from '@/pages/Home';
import RestaurantDetail from '@/pages/RestaurantDetail';
import Cart from '@/pages/Cart';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import Signup from '@/pages/Signup';
import CustomerOrders from '@/pages/CustomerOrders';
import CustomerProfile from '@/pages/CustomerProfile';
import DriverDashboard from '@/pages/DriverDashboard';
import OrderConfirmation from '@/pages/OrderConfirmation';
import DriverOnboarding from '@/pages/DriverOnboarding';
import Contact from '@/pages/Contact';
import FAQ from '@/pages/FAQ';
import Privacy from '@/pages/Privacy';
import VendorDashboard from '@/pages/VendorDashboard';
import VendorOrders from '@/pages/VendorOrders';
import VendorMenu from '@/pages/VendorMenu';
import VendorSettings from '@/pages/VendorSettings';
import VendorWaiting from '@/pages/VendorWaiting';
import VendorOnboarding from '@/pages/VendorOnboarding';
import PageNotFound from '@/lib/PageNotFound';

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminOrderDetails from '@/pages/AdminOrderDetails';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminRestaurants from '@/components/admin/AdminRestaurants';
import AdminMenuItems from '@/components/admin/AdminMenuItems';
import AdminUsers from '@/components/admin/AdminUsers';
import VendorManagement from '@/components/admin/VendorManagement';
import DisputeManagement from '@/components/admin/DisputeManagement';
import DriverPayouts from '@/components/admin/DriverPayouts';
import AdminVendorPayouts from '@/components/admin/AdminVendorPayouts';
import AdminSupportTickets from '@/components/admin/AdminSupportTickets';
import PackageDelivery from '@/pages/PackageDelivery';
import AdminPackageApprovals from '@/components/admin/AdminPackageApprovals';
import AdminEarningsOverview from '@/components/admin/AdminEarningsOverview';
import AdminMenuApprovals from '@/components/admin/AdminMenuApprovals';

import AdminDriversPage from '@/components/admin/AdminDriversPage';
import AdminFinancePage from '@/components/admin/AdminFinancePage';
import AdminSettingsPage from '@/components/admin/AdminSettingsPage';
import EdmondDashboard from '@/components/admin/EdmondDashboard';

// LOADING COMPONENT
const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-slate-600">Loading...</p>
  </div>
);

// Driver Pending Approval Component
const DriverPendingApproval = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="text-center max-w-md">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-10 h-10 text-yellow-600" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Application Pending</h1>
      <p className="text-gray-600 mb-4">
        Your driver application has been submitted and is being reviewed by the admin team.
      </p>
      <p className="text-sm text-gray-500">
        You will receive an email notification once your account is approved. This usually takes 24-48 hours.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="mt-6 bg-green text-white px-6 py-2 rounded-lg"
      >
        Return to Home
      </button>
    </div>
  </div>
);

function LoadingGuard({ children }) {
  const { loading } = useAuth();
  if (loading) return <Loader />;
  return children;
}

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function DriverGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'driver') return <Navigate to="/" replace />;

  switch (user.driver_status) {
    case null:      return <DriverOnboarding />;
    case 'pending': return <DriverPendingApproval />;
    case 'approved':return children;
    case 'rejected':return <Navigate to="/" replace />;
    default:        return <DriverOnboarding />;
  }
}

// UPDATED VendorGuard - Allows pending vendors to access onboarding
function VendorGuard({ children }) {
  const { user, loading } = useAuth();
  const [hasRestaurant, setHasRestaurant] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      if (user && user.role === 'vendor') {
        // If vendor is pending, check if they have a restaurant
        if (user.vendor_status === 'pending') {
          try {
            const response = await api.get('/vendor/restaurant');
            if (response.data?.id) {
              // Has restaurant - waiting for approval
              setHasRestaurant(true);
              navigate('/vendor-waiting');
              setChecking(false);
              return;
            }
          } catch {
            // No restaurant - need to onboard
            setHasRestaurant(false);
            navigate('/vendor/onboarding');
            setChecking(false);
            return;
          }
          // If we get here, no restaurant found
          setHasRestaurant(false);
          navigate('/vendor/onboarding');
          setChecking(false);
          return;
        }
        
        // If vendor is rejected, redirect to waiting page
        if (user.vendor_status === 'rejected') {
          setHasRestaurant(null);
          setChecking(false);
          navigate('/vendor-waiting');
          return;
        }
        
        // If vendor is approved, check for restaurant
        if (user.vendor_status === 'approved') {
          try {
            const response = await api.get('/vendor/restaurant');
            setHasRestaurant(!!response.data?.id);
          } catch {
            setHasRestaurant(false);
          }
        }
      }
      setChecking(false);
    };
    if (!loading) check();
  }, [user, loading, navigate]);

  if (loading || checking) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'vendor') return <Navigate to="/" replace />;
  
  // If vendor is pending, show onboarding (document upload)
  if (user.vendor_status === 'pending') {
    return <VendorOnboarding />;
  }
  
  // If vendor is rejected, show waiting page
  if (user.vendor_status === 'rejected') {
    return <VendorWaiting />;
  }
  
  // If vendor is approved but no restaurant, show onboarding
  if (user.vendor_status === 'approved' && hasRestaurant === false) {
    return <VendorOnboarding />;
  }
  
  return children;
}

// ── Admin sub-page wrappers with data fetching ──────────────────────────────────

const AdminOrdersPage = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const r = await api.get('/orders');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
    refetchInterval: 15000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  const drivers = users.filter(u => u.role === 'driver');
  return <AdminOrders orders={orders} drivers={drivers} onRefresh={() => {}} />;
};

const AdminRestaurantsPage = () => {
  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const r = await api.get('/restaurants');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  return <AdminRestaurants restaurants={restaurants} onRefresh={() => {}} />;
};

const AdminMenuPage = () => {
  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const r = await api.get('/restaurants');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  return <AdminMenuItems restaurants={restaurants} />;
};

const AdminUsersPage = () => {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  return <AdminUsers users={users} onRefresh={() => {}} />;
};

const AdminVendorsPage = () => {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  const vendors = users.filter(u => u.role === 'vendor');
  return <VendorManagement vendors={vendors} onRefresh={() => {}} />;
};

const AdminDisputesPage = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const r = await api.get('/orders');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });
  return <DisputeManagement orders={orders} users={users} onRefresh={() => {}} />;
};

// ── Query client ─────────────────────────────────────────────
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <LoadingGuard>
                <Routes>

                  {/* PUBLIC */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/package-delivery" element={<PackageDelivery />} />
                  </Route>

                  {/* CART */}
                  <Route path="/cart" element={<AuthGuard><Cart /></AuthGuard>} />

                  {/* AUTH */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* CUSTOMER */}
                  <Route element={<AppLayout />}>
                    <Route path="/profile" element={<AuthGuard><CustomerProfile /></AuthGuard>} />
                    <Route path="/orders"  element={<AuthGuard><CustomerOrders /></AuthGuard>} />
                  </Route>

                  {/* DRIVER */}
                  <Route path="/driver" element={<DriverGuard><DriverDashboard /></DriverGuard>} />

                  {/* VENDOR */}
                  <Route path="/vendor" element={<VendorGuard><VendorLayout /></VendorGuard>}>
                    <Route index         element={<VendorDashboard />} />
                    <Route path="orders"   element={<VendorOrders />} />
                    <Route path="menu"     element={<VendorMenu />} />
                    <Route path="settings" element={<VendorSettings />} />
                  </Route>
                  <Route path="/vendor/onboarding" element={<AuthGuard><VendorOnboarding /></AuthGuard>} />
                  <Route path="/vendor-waiting" element={<AuthGuard><VendorWaiting /></AuthGuard>} />  {/* ← ADDED THIS LINE */}

                  {/* ── ADMIN ── */}
                  <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="orders"         element={<AdminOrdersPage />} />
                    <Route path="orders/:id"     element={<AdminOrderDetails />} />
                    <Route path="restaurants"    element={<AdminRestaurantsPage />} />
                    <Route path="menu"           element={<AdminMenuPage />} />
                    <Route path="vendors"        element={<AdminVendorsPage />} />
                    <Route path="drivers"        element={<AdminDriversPage />} />
                    <Route path="users"          element={<AdminUsersPage />} />
                    <Route path="finance"        element={<AdminFinancePage />} />
                    <Route path="disputes"       element={<AdminDisputesPage />} />
                    <Route path="payouts"        element={<DriverPayouts />} />
                    <Route path="driver-payouts" element={<DriverPayouts />} />
                    <Route path="vendor-payouts" element={<AdminVendorPayouts />} />
                    <Route path="settings"       element={<AdminSettingsPage />} />
                    <Route path="support"        element={<AdminSupportTickets />} />
                    <Route path="package-approvals" element={<AdminPackageApprovals />} />
                    <Route path="/admin/earnings" element={<AdminEarningsOverview />} />
                    <Route path="menu-approvals" element={<AdminMenuApprovals />} />
                    <Route path="edmond-dashboard" element={<EdmondDashboard />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<PageNotFound />} />

                </Routes>

                <Toaster position="top-right" richColors />
              </LoadingGuard>
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;