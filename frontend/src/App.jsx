import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import VendorWaiting from '@/pages/VendorWaiting';
import VendorOnboarding from '@/pages/VendorOnboarding';
import PageNotFound from '@/lib/PageNotFound';

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
// DRIVER GUARD - FIXED
// ---------------------
function DriverGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'driver') return <Navigate to="/" replace />;
  
  // If driver_status is null, they need to complete onboarding
  if (user.driver_status === null) {
    return <DriverOnboarding />;
  }
  
  // If driver_status is pending, show waiting for approval message
  if (user.driver_status === 'pending') {
    return <DriverPendingApproval />;
  }
  
  // If rejected, show rejected message
  if (user.driver_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Application Rejected</h1>
          <p className="text-gray-600">
            Your driver application has been rejected. Please contact support for more information.
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
  }
  
  // If not approved, redirect home
  if (user.driver_status !== 'approved') {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

// ---------------------
// VENDOR GUARD - FIXED
// ---------------------
function VendorGuard({ children }) {
  const { user, loading } = useAuth();
  const [hasRestaurant, setHasRestaurant] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkVendorSetup = async () => {
      if (user && user.role === 'vendor') {
        try {
          const response = await api.get('/vendor/restaurant');
          setHasRestaurant(!!response.data && !!response.data.id);
        } catch (error) {
          console.log('No restaurant found, needs onboarding');
          setHasRestaurant(false);
        }
      }
      setChecking(false);
    };

    if (!loading) {
      checkVendorSetup();
    }
  }, [user, loading]);

  if (loading || checking) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'vendor') return <Navigate to="/" replace />;
  
  // Vendor not approved yet
  if (user.vendor_status !== 'approved') {
    return <VendorWaiting />;
  }
  
  // Vendor approved but no restaurant setup - GO TO ONBOARDING
  if (hasRestaurant === false) {
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

                  {/* ---------------- VENDOR ONBOARDING ---------------- */}
                  <Route
                    path="/vendor/onboarding"
                    element={
                      <AuthGuard>
                        <VendorOnboarding />
                      </AuthGuard>
                    }
                  />

                  {/* ---------------- ADMIN ROUTES ---------------- */}
                  <Route
                    path="/admin"
                    element={
                      <AdminGuard>
                        <AdminLayout />
                      </AdminGuard>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="orders" element={<AdminDashboard />} />
                    <Route path="orders/:id" element={<AdminOrderDetails />} />
                    <Route path="restaurants" element={<AdminDashboard />} />
                    <Route path="vendors" element={<AdminDashboard />} />
                    <Route path="menu" element={<AdminDashboard />} />
                    <Route path="drivers" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminDashboard />} />
                    <Route path="finance" element={<AdminDashboard />} />
                    <Route path="payouts" element={<AdminDashboard />} />
                    <Route path="disputes" element={<AdminDashboard />} />
                    <Route path="settings" element={<AdminDashboard />} />
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