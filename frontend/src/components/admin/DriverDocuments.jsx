import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

export default function DriverDocuments({ driver, onClose, onApprove, onReject }) {
  const [viewingDoc, setViewingDoc] = useState(null);

  const documents = [
    { key: 'id_copy', label: 'ID Copy / Passport', required: true },
    { key: 'pdp', label: 'PDP License', required: true },
    { key: 'profile_photo', label: 'Profile Photo', required: true },
    { key: 'car_license', label: 'Vehicle License', required: false },
    { key: 'car_info', label: 'Vehicle Information', required: true },
  ];

  const getDocumentUrl = (docKey) => {
    return driver[docKey] || null;
  };

  const handleApprove = async () => {
    try {
      await api.put(`/users/${driver.id}`, {
        driver_status: 'approved',
        is_available: 1
      });
      toast.success(`${driver.full_name} approved as driver`);
      if (onApprove) onApprove();
      onClose();
    } catch (error) {
      toast.error('Failed to approve driver');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/users/${driver.id}`, {
        driver_status: 'rejected',
        is_available: 0
      });
      toast.success(`${driver.full_name} rejected`);
      if (onReject) onReject();
      onClose();
    } catch (error) {
      toast.error('Failed to reject driver');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Driver Documents Review</DialogTitle>
          <p className="text-sm text-gray-500">
            Review documents for {driver.full_name} ({driver.email})
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Driver Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Driver Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Full Name:</span>
                <p className="font-medium">{driver.full_name}</p>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium">{driver.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="font-medium">{driver.phone || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-500">Applied On:</span>
                <p className="font-medium">
                  {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div>
            <h3 className="font-semibold mb-3">Submitted Documents</h3>
            <div className="space-y-3">
              {documents.map(doc => {
                const docUrl = getDocumentUrl(doc.key);
                return (
                  <div key={doc.key} className="border rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {doc.label}
                          {doc.required && <span className="text-red-500 text-xs ml-1">*</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {docUrl ? 'Uploaded' : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    {docUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingDoc(docUrl)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Car Information */}
          {driver.car_info && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Vehicle Information</h3>
              <p className="text-sm">{driver.car_info}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleApprove}
              className="flex-1 bg-green hover:bg-green/90 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Driver
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Driver
            </Button>
          </div>
        </div>

        {/* Image Preview Dialog */}
        {viewingDoc && (
          <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Document Preview</DialogTitle>
              </DialogHeader>
              <img src={viewingDoc} alt="Document" className="w-full rounded-lg" />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => window.open(viewingDoc, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setViewingDoc(null)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}