import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Store, ShoppingBag, DollarSign, TrendingUp, Clock, AlertCircle, 
  Wallet, CreditCard, Banknote, Percent, History, RefreshCw, Loader2,
  Phone, Mail, MapPin, Star, ChevronRight, XCircle, CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    total_revenue: 0,
    weekly_orders: 0,
    weekly_revenue: 0
  });

  // EARNINGS & WITHDRAWAL STATES
  const [earningsSummary, setEarningsSummary] = useState({
    total_earned: 0,
    available_balance: 0,
    withdrawn_total: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
  });
  const [showBankModal, setShowBankModal] = useState(false);

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num) ? num.toFixed(2) : '0.00';
  };

  useEffect(() => {
    checkRestaurant();
    fetchEarningsData();
    fetchWithdrawalHistory();
    fetchBankDetails();
  }, []);

  const checkRestaurant = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/restaurant');
      if (response.data && response.data.id) {
        setHasRestaurant(true);
        setRestaurant(response.data);
        fetchStats();
      } else {
        setHasRestaurant(false);
      }
    } catch (error) {
      console.error('No restaurant found:', error);
      setHasRestaurant(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/vendor/analytics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEarningsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/earnings-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const summary = data.summary || {};
      
      setEarningsSummary({
        total_earned: parseFloat(summary.total_earned) || 0,
        available_balance: parseFloat(summary.available_balance) || 0,
        withdrawn_total: parseFloat(summary.withdrawn_total) || 0
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/withdrawal-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWithdrawalHistory(data || []);
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/bank-details', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const saveBankDetails = async () => {
    if (!bankDetails.bank_name || !bankDetails.account_number || !bankDetails.account_holder) {
      toast.error('Please fill in bank name, account holder, and account number');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bankDetails)
      });
      
      if (!res.ok) throw new Error('Failed to save bank details');
      
      toast.success('Bank details saved successfully');
      setShowBankModal(false);
    } catch (err) {
      toast.error('Failed to save bank details');
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal amount is R100');
      return;
    }
    
    if (amount > (earningsSummary?.available_balance || 0)) {
      toast.error(`Insufficient balance. Available: R${formatCurrency(earningsSummary?.available_balance)}`);
      return;
    }
    
    if (!bankDetails.bank_name || !bankDetails.account_number) {
      toast.error('Please add your bank details first');
      setShowBankModal(true);
      return;
    }
    
    setLoadingWithdraw(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://lloyds-delivery.onrender.com/api/vendor/request-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          bank_name: bankDetails.bank_name,
          account_holder: bankDetails.account_holder,
          account_number: bankDetails.account_number,
          branch_code: bankDetails.branch_code
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchEarningsData();
      fetchWithdrawalHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchEarningsData(),
      fetchWithdrawalHistory(),
      fetchBankDetails()
    ]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const goToOnboarding = () => {
    navigate('/vendor/onboarding');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
      </div>
    );
  }

  // Show onboarding prompt if no restaurant
  if (!hasRestaurant) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-green" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome to Vendor Dashboard!</h2>
            <p className="text-gray-500 mb-4">
              You're approved! Now let's set up your restaurant to start receiving orders.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-blue-800 mb-2">What you'll need:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Restaurant name and description</li>
                <li>• Physical address for pickup</li>
                <li>• Operating hours</li>
                <li>• Delivery radius and fees</li>
              </ul>
            </div>
            <Button onClick={goToOnboarding} className="bg-green text-white">
              Set Up Restaurant →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's your business overview</p>
        </div>
        <Button 
          onClick={refreshData} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Restaurant Info Card */}
      {restaurant && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-800">
                    {restaurant.markup_percentage || 12.5}% Markup
                  </Badge>
                  {restaurant.is_active && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {restaurant.address}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/vendor/settings')}
              >
                Edit Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Summary Card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-700">Available Balance</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              R{formatCurrency(earningsSummary.available_balance)}
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              <span>Total Earned: R{formatCurrency(earningsSummary.total_earned)}</span>
              <span>Withdrawn: R{formatCurrency(earningsSummary.withdrawn_total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowBankModal(true)}
              variant="outline"
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bank Details
            </Button>
            <Button 
              onClick={() => setShowWithdrawModal(true)}
              className="bg-purple-600 text-white hover:bg-purple-700 shrink-0"
              disabled={!earningsSummary.available_balance || earningsSummary.available_balance < 100}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      </div>

      {/* Bank Details Card (if exists) */}
      {bankDetails.bank_name && (
        <div className="bg-white border rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {bankDetails.bank_name} • {bankDetails.account_number}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowBankModal(true)}
          >
            Update
          </Button>
        </div>
      )}

      {/* Withdrawal History */}
      {withdrawalHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Withdrawal History
          </h2>
          <div className="space-y-2">
            {withdrawalHistory.slice(0, 5).map((payout) => (
              <Card key={payout.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-purple-600">R{parseFloat(payout.amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {payout.status?.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-bold text-green">R{formatCurrency(stats.today_revenue)}</p>
                <p className="text-xs text-gray-400">{stats.today_orders || 0} orders</p>
              </div>
              <DollarSign className="w-8 h-8 text-green opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders || 0}</p>
                <p className="text-xs text-gray-400">Awaiting action</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">R{formatCurrency(stats.total_revenue)}</p>
                <p className="text-xs text-gray-400">All time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button 
          onClick={() => navigate('/vendor/orders')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>View Orders</span>
          {stats.pending_orders > 0 && (
            <span className="text-xs text-yellow-600">{stats.pending_orders} pending</span>
          )}
        </Button>
        
        <Button 
          onClick={() => navigate('/vendor/menu')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <Store className="w-5 h-5" />
          <span>Manage Menu</span>
          <span className="text-xs text-gray-400">Add/Edit items</span>
        </Button>

        <Button 
          onClick={() => navigate('/vendor/withdrawals')} 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
        >
          <History className="w-5 h-5" />
          <span>Withdrawal History</span>
          <span className="text-xs text-gray-400">View all payouts</span>
        </Button>
      </div>

      {/* Info Card about Markup */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Percent className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">How earnings work</p>
              <p className="text-xs text-blue-700 mt-1">
                Your menu prices shown to customers include a {restaurant?.markup_percentage || 12.5}% markup. 
                You receive 100% of your set vendor price. The markup covers delivery platform costs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-purple-600">
                R{formatCurrency(earningsSummary?.available_balance)}
              </p>
            </div>
            
            <div>
              <Label>Amount (R) *</Label>
              <Input
                type="number"
                placeholder="Minimum R100"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: R100</p>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Bank Details for Payout</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Bank:</span> {bankDetails.bank_name || 'Not set'}</p>
                <p><span className="font-medium">Account Holder:</span> {bankDetails.account_holder || 'Not set'}</p>
                <p><span className="font-medium">Account Number:</span> {bankDetails.account_number || 'Not set'}</p>
              </div>
              {(!bankDetails.bank_name || !bankDetails.account_number) && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ Please add your bank details before requesting withdrawal.
                </p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleWithdrawRequest} 
                disabled={loadingWithdraw || !bankDetails.bank_name || !bankDetails.account_number}
                className="flex-1 bg-purple-600 text-white"
              >
                {loadingWithdraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Request Withdrawal
              </Button>
              <Button onClick={() => setShowWithdrawModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Details Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bank Name *</Label>
              <Input
                placeholder="e.g., Capitec, FNB, Standard Bank"
                value={bankDetails.bank_name || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Holder Name *</Label>
              <Input
                placeholder="Name on the account"
                value={bankDetails.account_holder || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, account_holder: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input
                placeholder="Account number"
                value={bankDetails.account_number || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Branch Code (Optional)</Label>
              <Input
                placeholder="Branch code"
                value={bankDetails.branch_code || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, branch_code: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveBankDetails} className="flex-1 bg-green text-white">
                Save Bank Details
              </Button>
              <Button onClick={() => setShowBankModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}