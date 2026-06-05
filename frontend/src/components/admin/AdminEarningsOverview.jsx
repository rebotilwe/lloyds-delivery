import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Wallet, 
  CheckCircle, 
  Loader2,
  Phone,
  Mail,
  Building2,
  Truck,
  Clock,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

export default function AdminEarningsOverview() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all users and filter by role
      const usersResponse = await api.get('/users');
      const allUsers = usersResponse.data || [];
      
      // Get drivers
      const driversList = allUsers.filter(u => u.role === 'driver' && u.driver_status === 'approved');
      const driversWithEarnings = driversList.map(driver => ({
        ...driver,
        total_earned: parseFloat(driver.total_earnings || 0),
        available_balance: parseFloat(driver.available_balance || 0),
        withdrawn_total: parseFloat(driver.withdrawn_total || 0),
        pending_payout: Math.max(0, parseFloat(driver.available_balance || 0) - parseFloat(driver.withdrawn_total || 0))
      }));
      setDrivers(driversWithEarnings);

      // Get vendors
      const vendorsList = allUsers.filter(u => u.role === 'vendor' && u.vendor_status === 'approved');
      const vendorsWithEarnings = vendorsList.map(vendor => ({
        ...vendor,
        total_earned: parseFloat(vendor.total_earnings || 0),
        available_balance: parseFloat(vendor.available_balance || 0),
        withdrawn_total: parseFloat(vendor.withdrawn_total || 0),
        pending_payout: Math.max(0, parseFloat(vendor.available_balance || 0) - parseFloat(vendor.withdrawn_total || 0))
      }));
      setVendors(vendorsWithEarnings);

      // Calculate dashboard summary
      const driverStats = {
        total: driversWithEarnings.length,
        total_earned: driversWithEarnings.reduce((sum, d) => sum + d.total_earned, 0),
        total_available: driversWithEarnings.reduce((sum, d) => sum + d.available_balance, 0),
        total_withdrawn: driversWithEarnings.reduce((sum, d) => sum + d.withdrawn_total, 0),
        pending_payout: driversWithEarnings.reduce((sum, d) => sum + d.pending_payout, 0)
      };

      const vendorStats = {
        total: vendorsWithEarnings.length,
        total_earned: vendorsWithEarnings.reduce((sum, v) => sum + v.total_earned, 0),
        total_available: vendorsWithEarnings.reduce((sum, v) => sum + v.available_balance, 0),
        total_withdrawn: vendorsWithEarnings.reduce((sum, v) => sum + v.withdrawn_total, 0),
        pending_payout: vendorsWithEarnings.reduce((sum, v) => sum + v.pending_payout, 0)
      };

      setDashboard({ drivers: driverStats, vendors: vendorStats });

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Earnings Overview</h1>
          <p className="text-sm text-gray-500">View all driver and vendor earnings</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/payouts/drivers">
            <Button variant="outline" className="border-green-500 text-green-600">
              <Truck className="w-4 h-4 mr-2" />
              Driver Payouts
            </Button>
          </Link>
          <Link to="/admin/payouts/vendors">
            <Button variant="outline" className="border-purple-500 text-purple-600">
              <Building2 className="w-4 h-4 mr-2" />
              Vendor Payouts
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards - Drivers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold">Driver Earnings Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Drivers</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboard?.drivers?.total || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">R{formatCurrency(dashboard?.drivers?.total_earned)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Available Balance</p>
                  <p className="text-2xl font-bold text-blue-600">R{formatCurrency(dashboard?.drivers?.total_available)}</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Withdrawn Total</p>
                  <p className="text-2xl font-bold text-gray-600">R{formatCurrency(dashboard?.drivers?.total_withdrawn)}</p>
                </div>
                <Banknote className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pending Payout</p>
                  <p className="text-2xl font-bold text-yellow-600">R{formatCurrency(dashboard?.drivers?.pending_payout)}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Vendors */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">Vendor Earnings Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Vendors</p>
                  <p className="text-2xl font-bold text-purple-600">{dashboard?.vendors?.total || 0}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">R{formatCurrency(dashboard?.vendors?.total_earned)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Available Balance</p>
                  <p className="text-2xl font-bold text-purple-600">R{formatCurrency(dashboard?.vendors?.total_available)}</p>
                </div>
                <Wallet className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Withdrawn Total</p>
                  <p className="text-2xl font-bold text-gray-600">R{formatCurrency(dashboard?.vendors?.total_withdrawn)}</p>
                </div>
                <Banknote className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pending Payout</p>
                  <p className="text-2xl font-bold text-yellow-600">R{formatCurrency(dashboard?.vendors?.pending_payout)}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for detailed lists */}
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drivers">Driver Details</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Details</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Withdrawn</TableHead>
                    <TableHead className="text-right">Pending Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No drivers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {driver.email}</span>
                            {driver.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {driver.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={driver.vehicle_type === 'car' ? 'text-blue-600' : 'text-green-600'}>
                            {driver.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">R{formatCurrency(driver.total_earned)}</TableCell>
                        <TableCell className="text-right text-green-600">R{formatCurrency(driver.available_balance)}</TableCell>
                        <TableCell className="text-right text-gray-500">R{formatCurrency(driver.withdrawn_total)}</TableCell>
                        <TableCell className="text-right text-yellow-600 font-medium">R{formatCurrency(driver.pending_payout)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Withdrawn</TableHead>
                    <TableHead className="text-right">Pending Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No vendors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {vendor.email}</span>
                            {vendor.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {vendor.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">R{formatCurrency(vendor.total_earned)}</TableCell>
                        <TableCell className="text-right text-purple-600">R{formatCurrency(vendor.available_balance)}</TableCell>
                        <TableCell className="text-right text-gray-500">R{formatCurrency(vendor.withdrawn_total)}</TableCell>
                        <TableCell className="text-right text-yellow-600 font-medium">R{formatCurrency(vendor.pending_payout)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}