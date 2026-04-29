import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId') || `LD-${Math.floor(100000 + Math.random() * 900000)}`;
  const restaurantName = params.get('restaurant') || 'the restaurant';
  const estimatedTime = params.get('eta') || '30-45 min';

  const [count, setCount] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-green/10 flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-green" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900">Order Placed!</h1>
          <p className="text-gray-500 mt-2">
            Your order from <span className="font-semibold text-gray-900">{decodeURIComponent(restaurantName)}</span> has been received.
          </p>
        </div>

        {/* Order ID */}
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ORDER ID</p>
          <p className="text-2xl font-mono font-bold text-navy">{orderId}</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-left">
            <Clock className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Estimated Time</p>
            <p className="font-semibold text-gray-900">{estimatedTime}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-left">
            <Package className="w-5 h-5 text-green mb-2" />
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-semibold text-gray-900">Pending</p>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          You can track your order status in real-time on the Orders page.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link to="/orders">
            <Button className="w-full bg-navy hover:bg-navy/90 text-white h-12 font-semibold">
              Track My Order
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full h-12">
              Back to Home
            </Button>
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Redirecting to orders in <span className="font-bold text-green">{count}s</span>
        </p>
      </div>
    </div>
  );
}