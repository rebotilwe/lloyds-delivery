import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, Package, Loader2, ArrowLeft } from 'lucide-react';
import { formatOrderStatus } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const orderId = location.state?.orderId || localStorage.getItem('lastOrderId');
  const [order, setOrder] = useState(null);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        // If coming from Yoco redirect, update payment status
        const urlParams = new URLSearchParams(window.location.search);
        const isYocoRedirect = urlParams.has('orderId') && !location.state?.orderId;
        
        if (isYocoRedirect) {
          await fetch(`https://lloyds-delivery.onrender.com/api/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payment_status: 'paid',
              payment_transaction_id: `yoco_${Date.now()}`
            })
          });
          toast.success('Payment confirmed!');
        }

        const res = await fetch(`https://lloyds-delivery.onrender.com/api/orders/${orderId}`);
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.log('Error fetching order:', err);
        toast.error('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, location.state?.orderId]);

  // Auto redirect timer - FIXED: use a ref to track if redirect has happened
  useEffect(() => {
    if (!orderId || redirecting) return;
    
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setRedirecting(true);
          // Use navigate with replace to avoid state issues
          navigate('/orders', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, orderId, redirecting]);

  const handleSkipRedirect = () => {
    setRedirecting(true);
    navigate('/orders', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-6">We couldn't find your order. Please check your orders page.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/orders">
              <Button className="bg-green text-white">View My Orders</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPackageDelivery = order?.delivery_type && order?.delivery_type !== 'food';
  const isPendingApproval = order?.status === 'pending_approval';
  const isRejected = order?.status === 'rejected';

  // If order is rejected, show different UI
  if (isRejected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
              <Clock className="w-14 h-14 text-red-500" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-red-600">Order Rejected</h1>

          <p className="text-gray-500">
            Your package delivery request has been rejected by admin.
          </p>

          {order?.admin_rejection_reason && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-left">
                <p className="text-sm font-medium text-red-800 mb-1">Reason for rejection:</p>
                <p className="text-sm text-red-700">{order.admin_rejection_reason}</p>
              </CardContent>
            </Card>
          )}

          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">ORDER ID</p>
            <p className="text-xl font-bold text-navy">#{orderId}</p>
          </div>

          <div className="space-y-3">
            <Link to="/package-delivery">
              <Button className="w-full bg-green text-white h-12">
                Try Again
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full h-12">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success/Pending Icon */}
        <div className="flex justify-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isPendingApproval ? 'bg-yellow-100' : 'bg-green/10'}`}>
            {isPendingApproval ? (
              <Clock className="w-14 h-14 text-yellow-500" />
            ) : (
              <CheckCircle className="w-14 h-14 text-green" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-black">
          {isPendingApproval ? 'Pending Approval' : 'Order Placed!'}
        </h1>

        <p className="text-gray-500">
          {isPendingApproval 
            ? 'Your package delivery request has been submitted. Admin will review and approve shortly.'
            : isPackageDelivery 
              ? 'Your package delivery has been confirmed and is being processed.'
              : 'Your order has been received successfully. The restaurant will start preparing it shortly.'}
        </p>

        {/* Order ID */}
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">ORDER ID</p>
          <p className="text-xl font-bold text-navy">#{orderId}</p>
        </div>

        {/* Delivery Type Badge */}
        {isPackageDelivery && (
          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-sm text-purple-700">📦 Package Delivery</p>
          </div>
        )}

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border rounded-xl p-4 text-left">
            <Clock className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-semibold">
              {isPendingApproval ? 'Awaiting Approval' : formatOrderStatus(order?.status)}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4 text-left">
            <Package className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold">R{Number(order?.total || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Delivery Time Estimate */}
        {order?.estimated_prep_time && !isPendingApproval && !isPackageDelivery && (
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              ⏱️ Estimated preparation time: ~{order.estimated_prep_time} minutes
            </p>
          </div>
        )}

        {isPendingApproval && (
          <div className="bg-yellow-50 rounded-xl p-3">
            <p className="text-xs text-yellow-700">
              ⏳ Your package delivery is pending admin approval. You will be notified once approved.
            </p>
          </div>
        )}

        {isPackageDelivery && order?.status === 'pending_driver' && !isPendingApproval && (
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              🔍 Looking for a driver. You'll be notified when one is assigned.
            </p>
          </div>
        )}

        {isPackageDelivery && order?.status === 'assigned' && !isPendingApproval && (
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-sm text-green-700">
              ✅ Driver assigned! Track your delivery live.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          {isPendingApproval ? 'We\'ll notify you once approved.' : 'Track your order in real time.'}
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <Link to="/orders">
            <Button className="w-full bg-green text-white h-12">
              {isPendingApproval ? 'View My Orders' : 'Track Order'}
            </Button>
          </Link>

          <Link to="/">
            <Button variant="outline" className="w-full h-12">
              Back to Home
            </Button>
          </Link>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-gray-400 hover:text-gray-600"
            onClick={handleSkipRedirect}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Skip redirect ({count}s)
          </Button>
        </div>

        {/* Timer */}
        <p className="text-xs text-gray-400">
          Redirecting in <b>{count}s</b>
        </p>
      </div>
    </div>
  );
}