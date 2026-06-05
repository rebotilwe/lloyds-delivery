import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock,
  Store,
  DollarSign,
  User,
  Mail,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

export default function AdminMenuApprovals() {
  const { socket, online } = useSocket();
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [rejectedItems, setRejectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAllItems();
  }, []);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/menu/all');
      const items = response.data || [];
      setPendingItems(items.filter(i => i.approval_status === 'pending'));
      setApprovedItems(items.filter(i => i.approval_status === 'approved'));
      setRejectedItems(items.filter(i => i.approval_status === 'rejected'));
    } catch (err) {
      console.error('Error fetching menu items:', err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const approveItem = async (item) => {
    setProcessing(true);
    try {
      await api.put(`/admin/menu/${item.id}/approve`);
      toast.success(`"${item.name}" approved!`);
      fetchAllItems();
    } catch (err) {
      toast.error('Failed to approve item');
    } finally {
      setProcessing(false);
    }
  };

  const rejectItem = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessing(true);
    try {
      await api.put(`/admin/menu/${selectedItem.id}/reject`, {
        rejection_reason: rejectionReason
      });
      toast.success(`"${selectedItem.name}" rejected`);
      setShowRejectModal(false);
      setSelectedItem(null);
      setRejectionReason('');
      fetchAllItems();
    } catch (err) {
      toast.error('Failed to reject item');
    } finally {
      setProcessing(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Menu Item Approvals</h1>
          <p className="text-sm text-gray-500">Review and approve vendor menu items</p>
        </div>
        <Button onClick={fetchAllItems} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{pendingItems.length}</p>
            <p className="text-xs text-gray-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{approvedItems.length}</p>
            <p className="text-xs text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{rejectedItems.length}</p>
            <p className="text-xs text-gray-500">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedItems.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No pending menu items for approval
              </CardContent>
            </Card>
          ) : (
            pendingItems.map((item) => (
              <PendingMenuItemCard
                key={item.id}
                item={item}
                onApprove={() => approveItem(item)}
                onReject={() => {
                  setSelectedItem(item);
                  setShowRejectModal(true);
                }}
                processing={processing}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No approved menu items
              </CardContent>
            </Card>
          ) : (
            approvedItems.map((item) => (
              <ApprovedMenuItemCard key={item.id} item={item} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejectedItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No rejected menu items
              </CardContent>
            </Card>
          ) : (
            rejectedItems.map((item) => (
              <RejectedMenuItemCard key={item.id} item={item} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">{selectedItem?.name}</p>
              <p className="text-sm text-gray-500">From: {selectedItem?.vendor_name}</p>
              <p className="text-sm text-gray-500">Restaurant: {selectedItem?.restaurant_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                placeholder="Explain why this menu item is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={rejectItem}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 text-white"
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Rejection
              </Button>
              <Button onClick={() => setShowRejectModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingMenuItemCard({ item, onApprove, onReject, processing }) {
  return (
    <Card className="border-yellow-200 hover:shadow-md transition">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <Badge className="bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <DollarSign className="w-4 h-4" />
                R{formatCurrency(item.price)}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Store className="w-4 h-4" />
                {item.restaurant_name}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <User className="w-4 h-4" />
                {item.vendor_name}
              </span>
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Mail className="w-3 h-3" />
                {item.vendor_email}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Submitted: {new Date(item.submitted_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={onApprove}
              disabled={processing}
              className="bg-green-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={onReject}
              disabled={processing}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovedMenuItemCard({ item }) {
  return (
    <Card className="border-green-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <DollarSign className="w-4 h-4" />
                R{formatCurrency(item.price)}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Store className="w-4 h-4" />
                {item.restaurant_name}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <User className="w-4 h-4" />
                {item.vendor_name}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Approved: {new Date(item.approved_at).toLocaleString()}
              {item.approved_by_name && ` by ${item.approved_by_name}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RejectedMenuItemCard({ item }) {
  return (
    <Card className="border-red-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                Rejected
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <DollarSign className="w-4 h-4" />
                R{formatCurrency(item.price)}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Store className="w-4 h-4" />
                {item.restaurant_name}
              </span>
            </div>
            {item.rejection_reason && (
              <p className="text-sm text-red-600 mt-2">
                Reason: {item.rejection_reason}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Rejected: {new Date(item.approved_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}