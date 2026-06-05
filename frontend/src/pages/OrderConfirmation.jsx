import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, Package } from 'lucide-react';
import { formatOrderStatus } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const orderId = location.state?.orderId || localStorage.getItem('lastOrderId');
  const [order, setOrder] = useState(null);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(true);

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
        }

        const res = await fetch(`https://lloyds-delivery.onrender.com/api/orders/${orderId}`);
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.log('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, location.state?.orderId]);

  // Auto redirect timer
  useEffect(() => {
    if (!orderId) return;
    
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, orderId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green" />
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Order not found</p>
          <Link to="/">
            <Button className="mt-4">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPackageDelivery = order?.delivery_type && order?.delivery_type !== 'food';
  const isPendingApproval = order?.status === 'pending_approval';

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
            : 'Your order has been received successfully.'}
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
            <p className="font-semibold">R{order?.total || 0}</p>
          </div>
        </div>

        {isPendingApproval && (
          <div className="bg-yellow-50 rounded-xl p-3">
            <p className="text-xs text-yellow-700">
              ⏳ Your package delivery is pending admin approval. You will be notified once approved.
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
        </div>

        {/* Timer */}
        <p className="text-xs text-gray-400">
          Redirecting in <b>{count}s</b>
        </p>
      </div>
    </div>
  );
}