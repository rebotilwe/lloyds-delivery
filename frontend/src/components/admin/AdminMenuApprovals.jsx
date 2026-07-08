import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import {
  CheckCircle, XCircle, Clock, RefreshCw, Store,
  DollarSign, Tag, FileText, AlertCircle, Loader2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AdminMenuApprovals() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [processing, setProcessing] = useState({});

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      // FIX #12: previously this called a non-existent or wrong endpoint.
      // Using the correct admin endpoint for pending menu items.
      const res = await api.get('/admin/menu-items/pending');
      const data = res?.data ?? (Array.isArray(res) ? res : []);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pending menu items:', err);
      setError('Failed to load pending menu items. Please check the backend endpoint.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (itemId, itemName) => {
    setProcessing(prev => ({ ...prev, [itemId]: 'approving' }));
    try {
      await api.put(`/admin/menu-items/${itemId}/approve`);
      toast.success(`"${itemName}" approved and now visible to customers`);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      toast.error('Failed to approve menu item');
    } finally {
      setProcessing(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    }
  };

  const handleReject = async (itemId, itemName) => {
    const reason = window.prompt(`Rejection reason for "${itemName}" (optional):`);
    if (reason === null) return; // user cancelled prompt
    setProcessing(prev => ({ ...prev, [itemId]: 'rejecting' }));
    try {
      await api.put(`/admin/menu-items/${itemId}/reject`, { reason: reason || 'No reason provided' });
      toast.success(`"${itemName}" rejected`);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      toast.error('Failed to reject menu item');
    } finally {
      setProcessing(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    }
  };

  const formatCurrency = (v) => {
    const n = parseFloat(v);
    return !isNaN(n) ? `R${n.toFixed(2)}` : '—';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Menu Approvals</h2>
          <p className="text-sm text-gray-500">
            Review and approve new menu items submitted by vendors
          </p>
        </div>
        <Button onClick={fetchPending} variant="outline" size="sm" className="rounded-xl" disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Error state — FIX #12 */}
      {!loading && error && (
        <Card className="rounded-2xl border-red-100 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-800 mb-1">Could not load menu approvals</p>
            <p className="text-xs text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPending} variant="outline" size="sm" className="rounded-xl border-red-300 text-red-600">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="p-10 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No pending menu items to review</p>
          </CardContent>
        </Card>
      )}

      {/* Pending items */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium border border-yellow-200">
              <Clock className="w-3 h-3" /> {items.length} pending review
            </span>
          </div>
          <div className="space-y-3">
            {items.map(item => {
              const isProcessing = processing[item.id];
              return (
                <Card key={item.id} className="rounded-2xl border-gray-100 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-4">

                      {/* Image */}
                      {item.image_url && (
                        <div className="w-full sm:w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            {item.restaurant_name && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Store className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{item.restaurant_name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.category && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                                <Tag className="w-2.5 h-2.5 mr-1" />{item.category}
                              </Badge>
                            )}
                            <span className="font-bold text-green-600 text-sm">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                        )}

                        {item.submitted_at && (
                          <p className="text-[10px] text-gray-400 mt-2">
                            Submitted {new Date(item.submitted_at).toLocaleDateString()}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApprove(item.id, item.name)}
                            disabled={!!isProcessing}
                            style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing === 'approving'
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id, item.name)}
                            disabled={!!isProcessing}
                            style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing === 'rejecting'
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}