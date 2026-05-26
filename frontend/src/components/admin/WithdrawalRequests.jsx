import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Eye,
  Clock,
  Banknote,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function WithdrawalRequests({ drivers, onRefresh }) {
  const [requests, setRequests] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/withdrawals');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      // Mock data for demo
      setRequests([
        { 
          id: 1, 
          driver_id: 1, 
          driver_name: 'John Doe', 
          amount: 250, 
          status: 'pending', 
          requested_at: new Date().toISOString(),
          bank_details: { bank_name: 'FNB', account_number: '****1234', account_name: 'John Doe' }
        },
        { 
          id: 2, 
          driver_id: 2, 
          driver_name: 'Jane Smith', 
          amount: 180, 
          status: 'pending', 
          requested_at: new Date().toISOString(),
          bank_details: { bank_name: 'Capitec', account_number: '****5678', account_name: 'Jane Smith' }
        },
        { 
          id: 3, 
          driver_id: 3, 
          driver_name: 'Mike Johnson', 
          amount: 95, 
          status: 'pending', 
          requested_at: new Date().toISOString(),
          bank_details: { bank_name: 'Standard Bank', account_number: '****9012', account_name: 'Mike Johnson' }
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (requestId, status) => {
    setProcessing(true);
    try {
      await api.put(`/admin/withdrawals/${requestId}`, { status });
      toast.success(`Withdrawal ${status === 'paid' ? 'marked as paid' : 'rejected'}`);
      fetchWithdrawals();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'paid');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const totalPending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-green" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-yellow-600">{pendingRequests.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-green-600">{completedRequests.length}</p>
          <p className="text-xs text-gray-500">Paid</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-blue-600">R{totalPending.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Pending</p>
        </div>
      </div>

      {/* Pending Withdrawals */}
      {pendingRequests.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Pending Withdrawal Requests ({pendingRequests.length})</h3>
          {pendingRequests.map(request => (
            <div key={request.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border rounded-lg hover:shadow-md transition">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-4 h-4 text-green" />
                  <p className="font-semibold text-green">R{request.amount.toFixed(2)}</p>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    <Clock className="w-3 h-3 mr-1" /> Pending
                  </Badge>
                </div>
                <p className="font-medium">{request.driver_name}</p>
                <p className="text-xs text-gray-500">
                  Requested: {format(new Date(request.requested_at), 'dd MMM yyyy, h:mm a')}
                </p>
                {request.bank_details && (
                  <p className="text-xs text-gray-400 mt-1">
                    {request.bank_details.bank_name} • {request.bank_details.account_number}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedRequest(request)}
                >
                  <Eye className="w-3 h-3 mr-1" /> Details
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => processWithdrawal(request.id, 'paid')}
                  className="bg-green text-white"
                  disabled={processing}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => processWithdrawal(request.id, 'rejected')}
                  disabled={processing}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <CheckCircle className="w-10 h-10 text-green mx-auto mb-2" />
          <p className="text-sm text-gray-500">No pending withdrawal requests</p>
          <p className="text-xs text-gray-400">All driver payouts are up to date</p>
        </div>
      )}

      {/* Completed Withdrawals */}
      {completedRequests.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Completed Payouts ({completedRequests.length})</h3>
          <div className="space-y-2">
            {completedRequests.map(request => (
              <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{request.driver_name}</p>
                  <p className="text-xs text-gray-500">R{request.amount.toFixed(2)}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Paid</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Driver</p>
                <p className="font-medium">{selectedRequest.driver_name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-xl font-bold text-green">R{selectedRequest.amount.toFixed(2)}</p>
              </div>
              {selectedRequest.bank_details && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Bank Details</p>
                  <p className="text-sm">Bank: {selectedRequest.bank_details.bank_name}</p>
                  <p className="text-sm">Account: {selectedRequest.bank_details.account_number}</p>
                  <p className="text-sm">Name: {selectedRequest.bank_details.account_name}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => processWithdrawal(selectedRequest.id, 'paid')} className="flex-1 bg-green text-white">
                  Confirm Payment
                </Button>
                <Button onClick={() => setSelectedRequest(null)} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}