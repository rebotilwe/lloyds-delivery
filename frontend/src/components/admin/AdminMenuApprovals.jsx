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
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

export default function AdminMenuApprovals() {
  const [pendingItems,  setPendingItems]  = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [rejectedItems, setRejectedItems] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing,    setProcessing]    = useState(false);

  useEffect(() => { fetchAllItems(); }, []);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const res   = await api.get('/admin/menu/all');
      const items = res.data || [];
      setPendingItems(items.filter(i => i.approval_status === 'pending'));
      setApprovedItems(items.filter(i => i.approval_status === 'approved'));
      setRejectedItems(items.filter(i => i.approval_status === 'rejected'));
    } catch {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const approveItem = async (item) => {
    setProcessing(true);
    try {
      await api.put(`/admin/menu/${item.id}/approve`);
      toast.success(`"${item.name}" approved`);
      fetchAllItems();
    } catch {
      toast.error('Failed to approve item');
    } finally {
      setProcessing(false);
    }
  };

  const rejectItem = async () => {
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setProcessing(true);
    try {
      await api.put(`/admin/menu/${selectedItem.id}/reject`, { rejection_reason: rejectionReason });
      toast.success(`"${selectedItem.name}" rejected`);
      setShowRejectModal(false);
      setSelectedItem(null);
      setRejectionReason('');
      fetchAllItems();
    } catch {
      toast.error('Failed to reject item');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Menu Approvals</h1>
            <p className="text-sm text-slate-400">Review and approve vendor menu items</p>
          </div>
          <Button onClick={fetchAllItems} variant="outline" size="sm" className="self-start sm:self-auto">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending',  count: pendingItems.length,  icon: Clock,        bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
            { label: 'Approved', count: approvedItems.length, icon: CheckCircle,  bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
            { label: 'Rejected', count: rejectedItems.length, icon: XCircle,      bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100'   },
          ].map(({ label, count, icon: Icon, bg, text, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex flex-col items-center gap-1`}>
              <Icon className={`w-5 h-5 ${text}`} />
              <p className={`text-2xl font-bold ${text}`}>{count}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending ({pendingItems.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedItems.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedItems.length})</TabsTrigger>
          </TabsList>

          {/* PENDING */}
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingItems.length === 0 ? (
              <EmptyState message="No pending items — you're all caught up!" />
            ) : pendingItems.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                status="pending"
                actions={
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => approveItem(item)}
                      disabled={processing}
                      size="sm"
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1.5" />Approve</>}
                    </Button>
                    <Button
                      onClick={() => { setSelectedItem(item); setShowRejectModal(true); }}
                      disabled={processing}
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />Reject
                    </Button>
                  </div>
                }
              />
            ))}
          </TabsContent>

          {/* APPROVED */}
          <TabsContent value="approved" className="mt-4 space-y-3">
            {approvedItems.length === 0 ? (
              <EmptyState message="No approved menu items yet" />
            ) : approvedItems.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                status="approved"
                meta={item.approved_at ? `Approved ${new Date(item.approved_at).toLocaleString()}${item.approved_by_name ? ` by ${item.approved_by_name}` : ''}` : null}
              />
            ))}
          </TabsContent>

          {/* REJECTED */}
          <TabsContent value="rejected" className="mt-4 space-y-3">
            {rejectedItems.length === 0 ? (
              <EmptyState message="No rejected menu items" />
            ) : rejectedItems.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                status="rejected"
                meta={item.approved_at ? `Rejected ${new Date(item.approved_at).toLocaleString()}` : null}
                reason={item.rejection_reason}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Reject Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-0.5">
              <p className="font-semibold text-slate-800">{selectedItem?.name}</p>
              <p className="text-sm text-slate-500">Vendor: {selectedItem?.vendor_name}</p>
              <p className="text-sm text-slate-500">Restaurant: {selectedItem?.restaurant_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rejection reason <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="Explain why this item is being rejected…"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={rejectItem}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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

/* ── Shared card ─────────────────────────────────────────────── */
function MenuCard({ item, status, actions, meta, reason }) {
  const statusConfig = {
    pending:  { badge: 'bg-amber-100 text-amber-800',  icon: Clock,       label: 'Pending'  },
    approved: { badge: 'bg-green-100 text-green-800',  icon: CheckCircle, label: 'Approved' },
    rejected: { badge: 'bg-red-100 text-red-800',      icon: XCircle,     label: 'Rejected' },
  };
  const { badge, icon: StatusIcon, label } = statusConfig[status];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">

        {/* Top row: name + badge */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800">{item.name}</h3>
              <Badge className={`${badge} text-xs shrink-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />{label}
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1 text-green-600 font-semibold">
            <DollarSign className="w-4 h-4" />R{formatCurrency(item.price)}
          </span>
          {item.restaurant_name && (
            <span className="flex items-center gap-1 text-slate-500">
              <Store className="w-4 h-4" />{item.restaurant_name}
            </span>
          )}
          {item.vendor_name && (
            <span className="flex items-center gap-1 text-slate-500">
              <User className="w-4 h-4" />{item.vendor_name}
            </span>
          )}
          {item.vendor_email && (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Mail className="w-3 h-3" />{item.vendor_email}
            </span>
          )}
        </div>

        {/* Rejection reason */}
        {reason && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">
            <span className="font-medium">Reason: </span>{reason}
          </div>
        )}

        {/* Timestamps & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {meta ?? (item.submitted_at ? `Submitted ${new Date(item.submitted_at).toLocaleString()}` : '')}
          </p>
          {actions && <div className="flex">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}