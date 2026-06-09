import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, MapPin, User, Phone, Weight, Ruler, 
  CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminPackageApprovals() {
  const [pendingPackages, setPendingPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingPackages();
  }, []);

  const fetchPendingPackages = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders/admin/pending-packages');
      setPendingPackages(response.data || []);
    } catch (error) {
      console.error('Error fetching pending packages:', error);
      toast.error('Failed to load pending packages');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Approve package WITHOUT creating payment link
  const approvePackage = async (orderId) => {
    setProcessing(true);
    try {
      // Simply approve the package - update status from 'pending_approval' to 'pending_driver'
      // Payment will be handled by the customer later
      await api.put(`/orders/admin/approve-package/${orderId}`, { action: 'approve' });
      
      toast.success('Package approved! Customer can now pay and driver will be notified.', {
        duration: 5000,
      });
      
      fetchPendingPackages();
      setShowModal(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error approving package:', error);
      toast.error('Failed to approve package');
    } finally {
      setProcessing(false);
    }
  };

  const rejectPackage = async (orderId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessing(true);
    try {
      await api.put(`/orders/admin/approve-package/${orderId}`, { 
        action: 'reject', 
        rejection_reason: rejectionReason 
      });
      toast.success('Package rejected');
      fetchPendingPackages();
      setShowModal(false);
      setSelectedPackage(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting package:', error);
      toast.error('Failed to reject package');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold">Package Delivery Approvals</h2>
          <p className="text-sm text-gray-500">Review and approve package delivery requests</p>
        </div>
        <Button onClick={fetchPendingPackages} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingPackages.length}</p>
            <p className="text-xs text-gray-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">
              R{pendingPackages.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {pendingPackages.filter(p => p.package_weight > 30).length}
            </p>
            <p className="text-xs text-gray-500">Need Car</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Packages List */}
      {pendingPackages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
            <p className="text-gray-500">No pending package approvals</p>
            <p className="text-xs text-gray-400">All package requests have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingPackages.map((pkg) => (
            <Card key={pkg.id} className="border-yellow-200 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedPackage(pkg); setShowModal(true); }}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        {pkg.delivery_type === 'package' && '📦 Package'}
                        {pkg.delivery_type === 'document' && '📄 Document'}
                        {pkg.delivery_type === 'other' && '🚚 Other'}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                      {pkg.package_weight > 30 && (
                        <Badge className="bg-blue-100 text-blue-800">🚗 Car Required</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Pickup Address</p>
                        <p className="font-medium flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-green mt-0.5 shrink-0" />
                          {pkg.pickup_address || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Delivery Address</p>
                        <p className="font-medium flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                          {pkg.delivery_address}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      <span>👤 {pkg.recipient_name || 'No recipient'}</span>
                      {pkg.recipient_phone && <span>📞 {pkg.recipient_phone}</span>}
                      {pkg.package_weight && <span>⚖️ {pkg.package_weight}kg</span>}
                      {pkg.package_dimensions && <span>📏 {pkg.package_dimensions}</span>}
                      {pkg.requires_signature && <span className="text-blue-600">📝 Signature</span>}
                      {pkg.is_fragile && <span className="text-orange-600">⚠️ Fragile</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green">R{parseFloat(pkg.total).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(pkg.created_at), 'dd MMM HH:mm')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Review Package Request
            </DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Customer Details</p>
                <p className="text-sm">{selectedPackage.customer_name}</p>
                <p className="text-xs text-gray-500">{selectedPackage.customer_email}</p>
                {selectedPackage.customer_phone && (
                  <p className="text-xs text-gray-500">📞 {selectedPackage.customer_phone}</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Pickup Location</p>
                <p className="text-sm">{selectedPackage.pickup_address || 'Not specified'}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Delivery Location</p>
                <p className="text-sm">{selectedPackage.delivery_address}</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Recipient</p>
                <p className="text-sm">{selectedPackage.recipient_name || 'N/A'}</p>
                {selectedPackage.recipient_phone && (
                  <p className="text-xs text-gray-500">📞 {selectedPackage.recipient_phone}</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Package Details</p>
                <p className="text-sm">📦 {selectedPackage.package_description || 'No description'}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm">
                  {selectedPackage.package_weight && (
                    <span>⚖️ Weight: {selectedPackage.package_weight}kg</span>
                  )}
                  {selectedPackage.package_dimensions && (
                    <span>📏 Dimensions: {selectedPackage.package_dimensions}</span>
                  )}
                </div>
                {selectedPackage.requires_signature && (
                  <p className="text-sm text-blue-600 mt-1">📝 Signature Required</p>
                )}
                {selectedPackage.is_fragile && (
                  <p className="text-sm text-orange-600 mt-1">⚠️ Fragile Item</p>
                )}
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <p className="font-semibold text-sm">Payment Amount</p>
                <p className="text-2xl font-bold text-green">R{parseFloat(selectedPackage.total).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Customer will pay after approval</p>
              </div>

              {/* Rejection Reason Input */}
              <div>
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => approvePackage(selectedPackage.id)} 
                  disabled={processing}
                  className="flex-1 bg-green text-white"
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Package
                </Button>
                <Button 
                  onClick={() => rejectPackage(selectedPackage.id)} 
                  disabled={processing || !rejectionReason.trim()}
                  variant="destructive" 
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}