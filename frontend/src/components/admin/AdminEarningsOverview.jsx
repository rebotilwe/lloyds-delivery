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
  Users,
  TrendingUp,
  Wallet,
  Loader2,
  Phone,
  Mail,
  Building2,
  Truck,
  Clock,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    blue:   { text: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'text-blue-400'   },
    green:  { text: 'text-green-600',  bg: 'bg-green-50',  icon: 'text-green-400'  },
    purple: { text: 'text-purple-600', bg: 'bg-purple-50', icon: 'text-purple-400' },
    gray:   { text: 'text-slate-600',  bg: 'bg-slate-50',  icon: 'text-slate-400'  },
    yellow: { text: 'text-amber-600',  bg: 'bg-amber-50',  icon: 'text-amber-400'  },
  };
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`rounded-xl p-4 ${c.bg} flex items-center gap-3`}>
      <div className={`shrink-0 ${c.icon}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className={`text-xl font-bold leading-tight ${c.text}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AdminEarningsOverview() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, vendorPayoutsRes, driverPayoutsRes] = await Promise.all([
        api.get('/users'),
        api.get('/admin/vendor-payouts'),
        api.get('/driver/admin/payouts'),
      ]);

      const allUsers         = usersRes.data         || [];
      const allVendorPayouts = vendorPayoutsRes.data  || [];
      const allDriverPayouts = driverPayoutsRes.data  || [];

      const calcEarnings = (payoutsList) => {
        const total_paid    = payoutsList.filter(p => p.status === 'paid').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const total_pending = payoutsList.filter(p => p.status === 'pending').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        return {
          total_earned:      total_paid + total_pending,
          available_balance: total_pending,
          withdrawn_total:   total_paid,
          pending_payout:    total_pending,
        };
      };

      const vendorsWithEarnings = allUsers
        .filter(u => u.role === 'vendor' && u.vendor_status === 'approved')
        .map(vendor => ({ ...vendor, ...calcEarnings(allVendorPayouts.filter(p => p.vendor_id === vendor.id)) }));

      const driversWithEarnings = allUsers
        .filter(u => u.role === 'driver' && u.driver_status === 'approved')
        .map(driver => ({ ...driver, ...calcEarnings(allDriverPayouts.filter(p => p.driver_id === driver.id)) }));

      setVendors(vendorsWithEarnings);
      setDrivers(driversWithEarnings);

      const sum = (arr, key) => arr.reduce((s, x) => s + x[key], 0);
      setDashboard({
        drivers: { total: driversWithEarnings.length, total_earned: sum(driversWithEarnings, 'total_earned'), total_available: sum(driversWithEarnings, 'available_balance'), total_withdrawn: sum(driversWithEarnings, 'withdrawn_total'), pending_payout: sum(driversWithEarnings, 'pending_payout') },
        vendors:  { total: vendorsWithEarnings.length,  total_earned: sum(vendorsWithEarnings,  'total_earned'), total_available: sum(vendorsWithEarnings,  'available_balance'), total_withdrawn: sum(vendorsWithEarnings,  'withdrawn_total'), pending_payout: sum(vendorsWithEarnings,  'pending_payout') },
      });
    } catch {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
    </div>
  );

  const d = dashboard?.drivers;
  const v = dashboard?.vendors;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Earnings Overview</h1>
            <p className="text-sm text-slate-400">Driver and vendor earnings at a glance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/driver-payouts">
              <Button variant="outline" size="sm" className="border-green-400 text-green-600 hover:bg-green-50">
                <Truck className="w-4 h-4 mr-2" /> Driver Payouts
              </Button>
            </Link>
            <Link to="/admin/vendor-payouts">
              <Button variant="outline" size="sm" className="border-purple-400 text-purple-600 hover:bg-purple-50">
                <Building2 className="w-4 h-4 mr-2" /> Vendor Payouts
              </Button>
            </Link>
          </div>
        </div>

        {/* Driver Stats */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-slate-700">Driver Earnings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Drivers"    value={d?.total ?? 0}                           icon={Users}     color="blue"   />
            <StatCard label="Total Earned"     value={`R${formatCurrency(d?.total_earned)}`}   icon={TrendingUp} color="green"  />
            <StatCard label="Available"        value={`R${formatCurrency(d?.total_available)}`} icon={Wallet}    color="blue"   />
            <StatCard label="Withdrawn"        value={`R${formatCurrency(d?.total_withdrawn)}`} icon={Banknote}  color="gray"   />
            <StatCard label="Pending Payout"   value={`R${formatCurrency(d?.pending_payout)}`} icon={Clock}     color="yellow" />
          </div>
        </section>

        {/* Vendor Stats */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-slate-700">Vendor Earnings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Vendors"    value={v?.total ?? 0}                           icon={Users}      color="purple" />
            <StatCard label="Total Earned"     value={`R${formatCurrency(v?.total_earned)}`}   icon={TrendingUp} color="green"  />
            <StatCard label="Available"        value={`R${formatCurrency(v?.total_available)}`} icon={Wallet}    color="purple" />
            <StatCard label="Withdrawn"        value={`R${formatCurrency(v?.total_withdrawn)}`} icon={Banknote}  color="gray"   />
            <StatCard label="Pending Payout"   value={`R${formatCurrency(v?.pending_payout)}`} icon={Clock}     color="yellow" />
          </div>
        </section>

        {/* Detail Tables */}
        <Tabs defaultValue="drivers">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="drivers">Driver Details</TabsTrigger>
            <TabsTrigger value="vendors">Vendor Details</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {drivers.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-sm">No drivers found</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {drivers.map(driver => (
                      <div key={driver.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{driver.name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{driver.email}</p>
                            {driver.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{driver.phone}</p>}
                          </div>
                          <Badge variant="outline" className={driver.vehicle_type === 'car' ? 'text-blue-600 shrink-0' : 'text-green-600 shrink-0'}>
                            {driver.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Earned</p><p className="font-semibold text-slate-700">R{formatCurrency(driver.total_earned)}</p></div>
                          <div className="bg-green-50 rounded-lg p-2"><p className="text-slate-400">Available</p><p className="font-semibold text-green-700">R{formatCurrency(driver.available_balance)}</p></div>
                          <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Withdrawn</p><p className="font-semibold text-slate-500">R{formatCurrency(driver.withdrawn_total)}</p></div>
                          <div className="bg-amber-50 rounded-lg p-2"><p className="text-slate-400">Pending</p><p className="font-semibold text-amber-600">R{formatCurrency(driver.pending_payout)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Driver</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead className="text-right">Total Earned</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right">Withdrawn</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map(driver => (
                          <TableRow key={driver.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-medium text-slate-800">{driver.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs text-slate-500 gap-0.5">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{driver.email}</span>
                                {driver.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{driver.phone}</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={driver.vehicle_type === 'car' ? 'text-blue-600' : 'text-green-600'}>
                                {driver.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-700">R{formatCurrency(driver.total_earned)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">R{formatCurrency(driver.available_balance)}</TableCell>
                            <TableCell className="text-right text-slate-400">R{formatCurrency(driver.withdrawn_total)}</TableCell>
                            <TableCell className="text-right text-amber-600 font-semibold">R{formatCurrency(driver.pending_payout)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vendors">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {vendors.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-sm">No vendors found</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {vendors.map(vendor => (
                      <div key={vendor.id} className="p-4 space-y-2">
                        <div>
                          <p className="font-semibold text-slate-800">{vendor.name}</p>
                          {vendor.restaurant_name && <p className="text-xs text-purple-600">{vendor.restaurant_name}</p>}
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{vendor.email}</p>
                          {vendor.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Earned</p><p className="font-semibold text-slate-700">R{formatCurrency(vendor.total_earned)}</p></div>
                          <div className="bg-purple-50 rounded-lg p-2"><p className="text-slate-400">Available</p><p className="font-semibold text-purple-700">R{formatCurrency(vendor.available_balance)}</p></div>
                          <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-400">Withdrawn</p><p className="font-semibold text-slate-500">R{formatCurrency(vendor.withdrawn_total)}</p></div>
                          <div className="bg-amber-50 rounded-lg p-2"><p className="text-slate-400">Pending</p><p className="font-semibold text-amber-600">R{formatCurrency(vendor.pending_payout)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Vendor</TableHead>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Total Earned</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right">Withdrawn</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map(vendor => (
                          <TableRow key={vendor.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="font-medium text-slate-800">{vendor.name}</TableCell>
                            <TableCell className="text-slate-500 text-sm">{vendor.restaurant_name || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs text-slate-500 gap-0.5">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</span>
                                {vendor.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-slate-700">R{formatCurrency(vendor.total_earned)}</TableCell>
                            <TableCell className="text-right text-purple-600 font-medium">R{formatCurrency(vendor.available_balance)}</TableCell>
                            <TableCell className="text-right text-slate-400">R{formatCurrency(vendor.withdrawn_total)}</TableCell>
                            <TableCell className="text-right text-amber-600 font-semibold">R{formatCurrency(vendor.pending_payout)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}