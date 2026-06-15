import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  CheckCircle, 
  Search,
  Banknote,
  Loader2,
  Clock,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Helper function to safely format currency
const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

export default function DriverPayouts() {
  const [drivers, setDrivers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPeriod, setPayoutPeriod] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDrivers();
    fetchPayouts();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/users');
      const allDrivers = response.data?.filter(u => u.role === 'driver' && u.driver_status === 'approved') || [];
      
      const driversWithBalance = allDrivers.map(driver => ({
        ...driver,
        pending_balance: parseFloat(driver.available_balance || 0)
      }));
      
      setDrivers(driversWithBalance);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      // Using the correct endpoint from your routes
      const response = await api.get('/payouts/admin/driver/pending');
      const payoutsData = response.data || [];
      const fixedPayouts = payoutsData.map(p => ({
        ...p,
        amount: parseFloat(p.total_amount) || 0,
        driver_name: p.driver_name,
        driver_email: p.driver_email
      }));
      setPayouts(fixedPayouts);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const createPayout = async () => {
    if (!selectedDriver) {
      toast.error('Please select a driver');
      return;
    }
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parseFloat(payoutAmount) > (selectedDriver.pending_balance || 0)) {
      toast.error(`Amount exceeds driver's available balance of R${formatCurrency(selectedDriver.pending_balance)}`);
      return;
    }

    try {
      // This creates a payout record - the cron job will handle the actual payout
      await api.post('/driver/admin/payouts', {
        driver_id: selectedDriver.id,
        amount: parseFloat(payoutAmount),
        period_start: payoutPeriod.start,
        period_end: payoutPeriod.end,
        notes: `Payout for ${selectedDriver.name}`
      });
      
      toast.success(`Payout created for ${selectedDriver.name}`);
      setShowPayoutModal(false);
      setSelectedDriver(null);
      setPayoutAmount('');
      setPayoutPeriod({ start: '', end: '' });
      fetchPayouts();
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create payout');
    }
  };

  const markAsPaid = async (payoutId, driverName, amount) => {
    const reference = prompt(`Enter payment reference number for ${driverName} (R${amount.toFixed(2)}):`);
    if (!reference) return;
    
    try {
      await api.put(`/payouts/admin/driver/${payoutId}/mark-paid`, {
        payment_reference: reference,
        notes: `Paid with reference: ${reference}`
      });
      toast.success('Payout marked as paid');
      fetchPayouts();
      fetchDrivers();
    } catch (error) {
      console.error('Error marking payout:', error);
      toast.error(error.response?.data?.message || 'Failed to update payout');
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    if (filterStatus !== 'all' && payout.status !== filterStatus) return false;
    if (searchTerm) {
      return payout.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             payout.id?.toString().includes(searchTerm);
    }
    return true;
  });

  const totalPending = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalPaid = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

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
          <h2 className="text-lg font-bold">Driver Payouts</h2>
          <p className="text-sm text-gray-500">Manage driver earnings and payouts</p>
        </div>
        <Button onClick={() => setShowPayoutModal(true)} className="bg-green-600 text-white hover:bg-green-700">
          <DollarSign className="w-4 h-4 mr-2" />
          Create Payout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-600">R{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">R{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Payouts</p>
                <p className="text-2xl font-bold text-blue-600">{payouts.length}</p>
              </div>
              <Banknote className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by driver name or payout ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No payouts found
            </CardContent>
          </Card>
        ) : (
          filteredPayouts.map((payout) => {
            const safeAmount = parseFloat(payout.amount) || 0;
            return (
              <Card key={payout.id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">#{payout.id.substring(0, 8)}</p>
                        <Badge className={
                          payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {payout.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                      <p className="font-medium">{payout.driver_name || 'Unknown Driver'}</p>
                      <p className="text-xs text-gray-500">{payout.driver_email || ''}</p>
                      {payout.period_start && payout.period_end && (
                        <p className="text-xs text-gray-400 mt-1">
                          Period: {format(new Date(payout.period_start), 'dd MMM')} - {format(new Date(payout.period_end), 'dd MMM yyyy')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Created: {payout.created_at ? format(new Date(payout.created_at), 'dd MMM yyyy, h:mm a') : 'Unknown date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">R{formatCurrency(safeAmount)}</p>
                      {payout.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => markAsPaid(payout.id, payout.driver_name, safeAmount)}
                          className="mt-2 bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      {payout.status === 'paid' && payout.payment_reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {payout.payment_reference}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Payout Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Create Driver Payout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Driver</label>
              <Select onValueChange={(id) => {
                const driver = drivers.find(d => d.id?.toString() === id);
                setSelectedDriver(driver);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[9999] bg-white border shadow-lg rounded-md max-h-[300px] overflow-y-auto"
                  position="popper"
                  sideOffset={5}
                >
                  {drivers.length === 0 ? (
                    <div className="p-2 text-center text-gray-500 text-sm">
                      No drivers available
                    </div>
                  ) : (
                    drivers.map(driver => (
                      <SelectItem 
                        key={driver.id} 
                        value={driver.id?.toString() || ''}
                        className="cursor-pointer py-2"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{driver.name}</span>
                          <span className="text-xs text-gray-500">
                            Balance: R{formatCurrency(driver.pending_balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedDriver && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  R{formatCurrency(selectedDriver.pending_balance)}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Payout Amount (R)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Period Start</label>
                <Input
                  type="date"
                  value={payoutPeriod.start}
                  onChange={(e) => setPayoutPeriod({ ...payoutPeriod, start: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Period End</label>
                <Input
                  type="date"
                  value={payoutPeriod.end}
                  onChange={(e) => setPayoutPeriod({ ...payoutPeriod, end: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={createPayout} 
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                disabled={!selectedDriver || !payoutAmount}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create Payout
              </Button>
              <Button 
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedDriver(null);
                  setPayoutAmount('');
                  setPayoutPeriod({ start: '', end: '' });
                }} 
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}