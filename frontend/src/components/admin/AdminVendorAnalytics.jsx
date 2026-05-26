import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingBag, Star } from 'lucide-react';

export default function AdminVendorAnalytics({ vendors, orders }) {
  const vendorStats = vendors.map(vendor => {
    const vendorOrders = orders.filter(o => o.restaurant_id === vendor.restaurant_id);
    const totalRevenue = vendorOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const completedOrders = vendorOrders.filter(o => o.status === 'delivered').length;
    
    return { ...vendor, totalRevenue, completedOrders, totalOrders: vendorOrders.length };
  });

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">Vendor Performance</h2>
      <div className="grid grid-cols-1 gap-3">
        {vendorStats.map(vendor => (
          <Card key={vendor.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{vendor.name}</p>
                  <p className="text-xs text-gray-500">{vendor.email}</p>
                </div>
                <Badge className={vendor.vendor_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100'}>
                  {vendor.vendor_status || 'pending'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{vendor.totalOrders}</p>
                  <p className="text-xs text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">R{vendor.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">{vendor.completedOrders}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}