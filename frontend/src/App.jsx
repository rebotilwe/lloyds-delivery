import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SocketProvider } from '@/context/SocketContext';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/cartStore';

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
import AdminDashboard from '@/pages/AdminDashboard';
import AdminOrderDetails from '@/pages/AdminOrderDetails';
import OrderConfirmation from '@/pages/OrderConfirmation';
import DriverOnboarding from '@/pages/DriverOnboarding';
import Contact from '@/pages/Contact';
import FAQ from '@/pages/FAQ';
import Privacy from '@/pages/Privacy';
import VendorDashboard from '@/pages/VendorDashboard';
import VendorOrders from '@/pages/VendorOrders';
import VendorMenu from '@/pages/VendorMenu';
import VendorSettings from '@/pages/VendorSettings';
import PageNotFound from '@/lib/PageNotFound';

// ---------------------
// LOADING COMPONENT
// ---------------------
const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-slate-600">Loading...</p>
  </div>
);

// ---------------------
// LOADING GUARD
// ---------------------
function LoadingGuard({ children }) {
  const { loading } = useAuth();
  if (loading) return <Loader />;
  return children;
}

// ---------------------
// AUTH GUARD
// ---------------------
function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ---------------------
// ADMIN GUARD
// ---------------------
function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// ---------------------
// DRIVER GUARD
// ---------------------
function DriverGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'driver') return <Navigate to="/" replace />;
  if (user.driver_status !== 'approved') return <DriverOnboarding />;
  return children;
}

// ---------------------
// VENDOR GUARD
// ---------------------
// Update the VendorGuard function in App.jsx
function VendorGuard({ children }) {
  const { user, loading } = useAuth();
  const [vendorStatus, setVendorStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkVendor = async () => {
      if (user && user.role === 'vendor') {
        try {
          // Check if vendor has completed onboarding
          const response = await api.get('/vendor/restaurant').catch(() => ({ data: null }));
          setVendorStatus({
            approved: user.vendor_status === 'approved',
            hasRestaurant: !!response.data
          });
        } catch (error) {
          setVendorStatus({ approved: false, hasRestaurant: false });
        }
      }
      setChecking(false);
    };
    
    if (!loading) {
      checkVendor();
    }
  }, [user, loading]);

  if (loading || checking) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'vendor') return <Navigate to="/" replace />;
  
  // Vendor not approved yet
  if (user.vendor_status !== 'approved') {
    return <VendorWaiting />;
  }
  
  // Vendor approved but no restaurant setup
  if (!vendorStatus?.hasRestaurant) {
    return <VendorOnboarding />;
  }
  
  return children;
}

// ---------------------
const queryClient = new QueryClient();

// ---------------------
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <LoadingGuard>
                <Routes>

                  {/* ---------------- PUBLIC ---------------- */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                  </Route>

                  {/* ---------------- CART (PROTECTED) ---------------- */}
                  <Route
                    path="/cart"
                    element={
                      <AuthGuard>
                        <Cart />
                      </AuthGuard>
                    }
                  />

                  {/* ---------------- AUTH ---------------- */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* ---------------- CUSTOMER PROTECTED ROUTES ---------------- */}
                  <Route element={<AppLayout />}>
                    <Route
                      path="/profile"
                      element={
                        <AuthGuard>
                          <CustomerProfile />
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/orders"
                      element={
                        <AuthGuard>
                          <CustomerOrders />
                        </AuthGuard>
                      }
                    />
                  </Route>

                  {/* ---------------- DRIVER ---------------- */}
                  <Route
                    path="/driver"
                    element={
                      <DriverGuard>
                        <DriverDashboard />
                      </DriverGuard>
                    }
                  />

                  {/* ---------------- VENDOR ---------------- */}
                  <Route
                    path="/vendor"
                    element={
                      <VendorGuard>
                        <VendorLayout />
                      </VendorGuard>
                    }
                  >
                    <Route index element={<VendorDashboard />} />
                    <Route path="orders" element={<VendorOrders />} />
                    <Route path="menu" element={<VendorMenu />} />
                    <Route path="settings" element={<VendorSettings />} />
                  </Route>

                  {/* ---------------- ADMIN ROUTES ---------------- */}
                  <Route
                    path="/admin"
                    element={
                      <AdminGuard>
                        <AdminLayout />
                      </AdminGuard>
                    }
                  >
                    {/* Overview / Dashboard */}
                    <Route index element={<AdminDashboard />} />
                    
                    {/* Orders */}
                    <Route path="orders" element={<AdminDashboard />} />
                    <Route path="orders/:id" element={<AdminOrderDetails />} />
                    
                    {/* Restaurants */}
                    <Route path="restaurants" element={<AdminDashboard />} />
                    
                    {/* Vendors - NEW */}
                    <Route path="vendors" element={<AdminDashboard />} />
                    
                    {/* Menu Items */}
                    <Route path="menu" element={<AdminDashboard />} />
                    
                    {/* Drivers */}
                    <Route path="drivers" element={<AdminDashboard />} />
                    
                    {/* Users */}
                    <Route path="users" element={<AdminDashboard />} />
                    
                    {/* Finance - NEW */}
                    <Route path="finance" element={<AdminDashboard />} />
                    
                    {/* Disputes - NEW */}
                    <Route path="disputes" element={<AdminDashboard />} />
                    
                    {/* Settings */}
                    <Route path="settings" element={<AdminDashboard />} />
                    
                    {/* Alerts */}
                    <Route path="alerts" element={<AdminDashboard />} />
                  </Route>

                  {/* ---------------- 404 ---------------- */}
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