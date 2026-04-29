import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/cartStore';

// Layouts and Pages
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import RestaurantDetail from '@/pages/RestaurantDetail'; // Add this import
import Cart from '@/pages/Cart';
import Login from '@/pages/Login';
import CustomerOrders from '@/pages/CustomerOrders';
import DriverDashboard from '@/pages/DriverDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import PageNotFound from '@/lib/PageNotFound';
import OrderConfirmation from '@/pages/OrderConfirmation';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-green text-white px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Main App
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/restaurant" element={<RestaurantDetail />} /> {/* Add this route */}
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/orders" element={<CustomerOrders />} />
                  <Route path="/driver" element={<DriverDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />

                </Route>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<PageNotFound />} />
              </Routes>
              <Toaster position="top-right" richColors />
            </CartProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;