import React, { useState, useMemo } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Eye,
  MessageCircle,
  FileText,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DisputeManagement({ orders, users, onRefresh }) {
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  // Generate disputes from orders (in real app, these come from a disputes table)
  const disputes = useMemo(() => {
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const lateOrders = orders.filter(o => 
      o.status === 'delivered' && 
      o.delivered_at && 
      new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime() > 90 * 60 * 1000 // 90 min late
    );
    const highValueRefunds = orders.filter(o => 
      o.status === 'cancelled' && Number(o.total) > 200
    );
    
    return [
      ...cancelledOrders.slice(0, 5).map(o => ({ 
        id: `cancel-${o.id}`,
        type: 'cancellation', 
        order: o, 
        status: 'pending',
        reason: 'Customer cancelled after preparation started',
        created_at: o.created_at
      })),
      ...lateOrders.slice(0, 3).map(o => ({ 
        id: `late-${o.id}`,
        type: 'late_delivery', 
        order: o, 
        status: 'pending',
        reason: 'Delivery took longer than estimated',
        created_at: o.created_at
      })),
      ...highValueRefunds.slice(0, 2).map(o => ({ 
        id: `refund-${o.id}`,
        type: 'refund_request', 
        order: o, 
        status: 'pending',
        reason: 'Customer requested refund for high-value order',
        created_at: o.created_at
      })),
    ];
  }, [orders]);

  const resolveDispute = async (dispute, resolution_type) => {
    setResolving(true);
    try {
      await api.post('/admin/resolve-dispute', {
        order_id: dispute.order.id,
        resolution: resolution_type,
        notes: resolution,
      });
      toast.success(`Dispute resolved: ${resolution_type === 'refund' ? 'Refund issued' : 'Dispute dismissed'}`);
      onRefresh();
      setSelectedDispute(null);
      setResolution('');
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const getDisputeIcon = (type) => {
    switch (type) {
      case 'cancellation': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'late_delivery': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'refund_request': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDisputeLabel = (type) => {
    switch (type) {
      case 'cancellation': return 'Cancellation Dispute';
      case 'late_delivery': return 'Late Delivery';
      case 'refund_request': return 'Refund Request';
      default: return 'Dispute';
    }
  };

  if (disputes.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green mx-auto mb-2" />
        <p className="text-gray-500">No active disputes</p>
        <p className="text-xs text-gray-400 mt-1">All orders are dispute-free</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-xl font-bold text-red-600">{disputes.filter(d => d.type === 'cancellation').length}</p>
          <p className="text-xs text-gray-500">Cancellations</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-xl font-bold text-orange-600">{disputes.filter(d => d.type === 'late_delivery').length}</p>
          <p className="text-xs text-gray-500">Late Deliveries</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xl font-bold text-blue-600">{disputes.filter(d => d.type === 'refund_request').length}</p>
          <p className="text-xs text-gray-500">Refund Requests</p>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-3">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getDisputeIcon(dispute.type)}
                  <Badge className={cn(
                    dispute.type === 'cancellation' ? "bg-red-100 text-red-800" :
                    dispute.type === 'late_delivery' ? "bg-orange-100 text-orange-800" :
                    "bg-blue-100 text-blue-800"
                  )}>
                    {getDisputeLabel(dispute.type)}
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50">
                    Pending
                  </Badge>
                </div>
                <p className="font-medium">Order #{dispute.order.id}</p>
                <p className="text-sm text-gray-500">Customer: {dispute.order.customer_name || 'Guest'}</p>
                <p className="text-sm text-gray-500">Amount: R{Number(dispute.order.total).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dispute.created_at && `Reported: ${format(new Date(dispute.created_at), 'dd MMM yyyy, h:mm a')}`}
                </p>
                <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                  <span className="font-medium">Reason:</span> {dispute.reason}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedDispute(dispute)}
                className="shrink-0"
              >
                <Eye className="w-3 h-3 mr-1" /> Review
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Resolve Dispute Modal */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Order #{selectedDispute.order.id}</p>
                <p className="text-sm font-medium">Customer: {selectedDispute.order.customer_name || 'Guest'}</p>
                <p className="text-sm">Amount: R{Number(selectedDispute.order.total).toFixed(2)}</p>
                <p className="text-sm">Status: {selectedDispute.order.status}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Dispute Reason</label>
                <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-1">
                  {selectedDispute.reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Explain how this dispute was resolved..."
                  className="mt-1"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  onClick={() => resolveDispute(selectedDispute, 'refund')}
                  className="flex-1 bg-blue-500 text-white"
                  disabled={resolving}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Issue Refund (R{Number(selectedDispute.order.total).toFixed(2)})
                </Button>
                <Button 
                  onClick={() => resolveDispute(selectedDispute, 'dismiss')}
                  variant="outline"
                  className="flex-1"
                  disabled={resolving}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss Dispute
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Refunding will credit the customer's original payment method
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}