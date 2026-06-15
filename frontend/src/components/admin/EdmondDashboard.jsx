import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Truck, 
  Store, 
  Package,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Wallet,
  Banknote,
  PiggyBank,
  ChartLine,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { api } from '@/api/client';

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? `R${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R0.00';
};

const formatCompactCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 'R0';
  if (num >= 1000000) return `R${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `R${(num / 1000).toFixed(1)}K`;
  return `R${num.toFixed(0)}`;
};

export default function EdmondDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [summary, setSummary] = useState({
    total_revenue: 0,
    platform_commission: 0,
    driver_payouts: 0,
    vendor_payouts: 0,
    operating_costs: 0,
    net_profit: 0,
    profit_margin: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [commissionData, setCommissionData] = useState([]);
  const [payoutData, setPayoutData] = useState([]);
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [edmondBalance, setEdmondBalance] = useState({
    current_balance: 0,
    total_earned: 0,
    total_withdrawn: 0
  });

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSummaryData(),
        fetchRevenueChart(),
        fetchCommissionChart(),
        fetchPayoutChart(),
        fetchTopRestaurants(),
        fetchTopDrivers(),
        fetchRecentTransactions(),
        fetchEdmondBalance()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      const response = await api.get('/admin/financial/summary', {
        params: { start_date: dateRange.start, end_date: dateRange.end }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchRevenueChart = async () => {
    try {
      const response = await api.get('/admin/financial/revenue-chart', {
        params: { start_date: dateRange.start, end_date: dateRange.end }
      });
      setRevenueData(response.data || []);
    } catch (error) {
      console.error('Error fetching revenue chart:', error);
    }
  };

  const fetchCommissionChart = async () => {
    try {
      const response = await api.get('/admin/financial/commission-chart', {
        params: { start_date: dateRange.start, end_date: dateRange.end }
      });
      setCommissionData(response.data || []);
    } catch (error) {
      console.error('Error fetching commission chart:', error);
    }
  };

  const fetchPayoutChart = async () => {
    try {
      const response = await api.get('/admin/financial/payout-chart', {
        params: { start_date: dateRange.start, end_date: dateRange.end }
      });
      setPayoutData(response.data || []);
    } catch (error) {
      console.error('Error fetching payout chart:', error);
    }
  };

  const fetchTopRestaurants = async () => {
    try {
      const response = await api.get('/admin/financial/top-restaurants', {
        params: { limit: 5 }
      });
      setTopRestaurants(response.data || []);
    } catch (error) {
      console.error('Error fetching top restaurants:', error);
    }
  };

  const fetchTopDrivers = async () => {
    try {
      const response = await api.get('/admin/financial/top-drivers', {
        params: { limit: 5 }
      });
      setTopDrivers(response.data || []);
    } catch (error) {
      console.error('Error fetching top drivers:', error);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await api.get('/admin/financial/recent-transactions', {
        params: { limit: 10 }
      });
      setRecentTransactions(response.data || []);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    }
  };

  const fetchEdmondBalance = async () => {
    try {
      const response = await api.get('/admin/edmond/balance');
      setEdmondBalance(response.data);
    } catch (error) {
      console.error('Error fetching Edmond balance:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleExportReport = async () => {
    try {
      const response = await api.get('/admin/financial/export', {
        params: { start_date: dateRange.start, end_date: dateRange.end },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <p className="text-sm text-gray-500">Complete overview of platform revenue, commissions, and payouts</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-36 text-sm"
              placeholder="Start date"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-36 text-sm"
              placeholder="End date"
            />
          </div>
          <Button onClick={handleExportReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchDashboardData} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Edmond's Balance Card */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5" />
                <p className="text-sm opacity-90">Edmond's Available Balance</p>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(edmondBalance.current_balance)}</p>
              <div className="flex gap-4 mt-2 text-xs opacity-80">
                <span>Total Earned: {formatCurrency(edmondBalance.total_earned)}</span>
                <span>Withdrawn: {formatCurrency(edmondBalance.total_withdrawn)}</span>
              </div>
            </div>
            <Button className="bg-white text-green-600 hover:bg-gray-100">
              <Banknote className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCompactCurrency(summary.total_revenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Platform Commission</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatCompactCurrency(summary.platform_commission)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Driver Payouts</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatCompactCurrency(summary.driver_payouts)}</p>
              </div>
              <Truck className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Vendor Payouts</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{formatCompactCurrency(summary.vendor_payouts)}</p>
              </div>
              <Store className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-gray-500">Net Profit</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.net_profit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-gray-500">Profit Margin</p>
            <p className="text-2xl font-bold text-blue-700">{summary.profit_margin}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-gray-500">Operating Costs</p>
            <p className="text-2xl font-bold text-gray-700">{formatCurrency(summary.operating_costs)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="commission">Commission Trend</TabsTrigger>
          <TabsTrigger value="payouts">Payouts Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `R${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="commission" name="Commission" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `R${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="commission" name="Platform Commission" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payoutData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `R${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="driver" name="Driver Payouts" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="vendor" name="Vendor Payouts" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Restaurants */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-500" />
                Top Performing Restaurants
              </h3>
              <Button variant="ghost" size="sm">
                <Eye className="w-3 h-3 mr-1" />
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {topRestaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{restaurant.name}</p>
                      <p className="text-xs text-gray-500">{restaurant.total_orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-green-600">{formatCurrency(restaurant.total_revenue)}</p>
                    <p className="text-xs text-gray-400">{restaurant.commission_paid} commission</p>
                  </div>
                </div>
              ))}
              {topRestaurants.length === 0 && (
                <p className="text-center text-gray-500 py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500" />
                Top Earning Drivers
              </h3>
              <Button variant="ghost" size="sm">
                <Eye className="w-3 h-3 mr-1" />
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {topDrivers.map((driver, index) => (
                <div key={driver.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.total_deliveries} deliveries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-orange-600">{formatCurrency(driver.total_earnings)}</p>
                    <p className="text-xs text-gray-400">⭐ {driver.rating || 0}★</p>
                  </div>
                </div>
              ))}
              {topDrivers.length === 0 && (
                <p className="text-center text-gray-500 py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2 text-xs text-gray-500">
                      {format(new Date(transaction.date), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="py-2">
                      <Badge className={
                        transaction.type === 'revenue' ? 'bg-green-100 text-green-800' :
                        transaction.type === 'withdrawal' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs">{transaction.description}</td>
                    <td className={`py-2 text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-2 text-right text-xs text-gray-500">{formatCurrency(transaction.balance)}</td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}