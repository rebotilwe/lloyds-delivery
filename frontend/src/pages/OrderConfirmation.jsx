import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, Package } from 'lucide-react';
import { formatOrderStatus } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ FIX: use state first, fallback to localStorage
  const orderId =
    location.state?.orderId ||
    localStorage.getItem('lastOrderId');

  const [order, setOrder] = useState(null);
  const [count, setCount] = useState(5);

  // -----------------------------
  // FETCH ORDER
  // -----------------------------
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `https://lloyds-delivery.onrender.com/api/orders/${orderId}`
        );

        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchOrder();
  }, [orderId]);

  // -----------------------------
  // AUTO REDIRECT
  // -----------------------------
  useEffect(() => {
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
  }, [navigate]);

  // -----------------------------
  // NO ORDER ID SAFETY
  // -----------------------------
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">

      <div className="max-w-md w-full text-center space-y-6">

        {/* SUCCESS ICON */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green/10 flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-green" />
          </div>
        </div>

        <h1 className="text-3xl font-black">Order Placed!</h1>

        <p className="text-gray-500">
          Your order has been received successfully.
        </p>

        {/* ORDER ID */}
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">ORDER ID</p>
          <p className="text-xl font-bold text-navy">
            #{orderId}
          </p>
        </div>

        {/* ORDER INFO */}
        <div className="grid grid-cols-2 gap-3">

          <div className="bg-white border rounded-xl p-4 text-left">
            <Clock className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Status</p>
           <p className="font-semibold">
  {formatOrderStatus(order?.status)}
</p>
          </div>

          <div className="bg-white border rounded-xl p-4 text-left">
            <Package className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold">
              R{order?.total || 0}
            </p>
          </div>

        </div>

        <p className="text-sm text-gray-500">
          Track your order in real time.
        </p>

        {/* BUTTONS */}
        <div className="space-y-3">

          <Link to="/orders">
            <Button className="w-full bg-green text-white h-12">
              Track Order
            </Button>
          </Link>

          <Link to="/">
            <Button variant="outline" className="w-full h-12">
              Back to Home
            </Button>
          </Link>

        </div>

        {/* TIMER */}
        <p className="text-xs text-gray-400">
          Redirecting in <b>{count}s</b>
        </p>

      </div>
    </div>
  );
}