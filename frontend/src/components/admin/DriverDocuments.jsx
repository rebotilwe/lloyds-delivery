import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Download, FileText, User, Mail, Phone, Calendar, Car, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

const BACKEND_URL = 'https://lloyds-delivery.onrender.com';

export default function DriverDocuments({ driver, onClose, onApprove, onReject }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const documents = [
    { key: 'id_copy', label: 'ID Copy / Passport', required: true, icon: <FileText className="w-4 h-4" /> },
    { key: 'pdp', label: 'PDP License', required: true, icon: <FileText className="w-4 h-4" /> },
    { key: 'profile_photo', label: 'Profile Photo', required: true, icon: <User className="w-4 h-4" /> },
    { key: 'car_license', label: 'Vehicle License', required: false, icon: <Car className="w-4 h-4" /> },
  ];

  // ✅ FIX: Return full URL for documents with better handling
  const getDocumentUrl = (docKey) => {
    const docPath = driver[docKey];
    if (!docPath) return null;
    
    // If it's already a full URL, return it
    if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
      return docPath;
    }
    
    // If it's a relative path starting with /uploads
    if (docPath.startsWith('/uploads')) {
      return `${BACKEND_URL}${docPath}`;
    }
    
    // If it's just a filename, construct the full path
    if (!docPath.includes('/')) {
      return `${BACKEND_URL}/uploads/drivers/${docPath}`;
    }
    
    return null;
  };

  const isImage = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) !== null;
  };

  const isPDF = (url) => {
    if (!url) return false;
    return url.match(/\.(pdf)$/i) !== null;
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, {
        driver_status: 'approved',
        is_available: 1
      });
      toast.success(`${driver.full_name || driver.name} approved as driver`);
      if (onApprove) onApprove();
      onClose();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve driver');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, {
        driver_status: 'rejected',
        is_available: 0
      });
      toast.success(`${driver.full_name || driver.name} rejected`);
      if (onReject) onReject();
      onClose();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject driver');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Document Card Component
  const MobileDocumentCard = ({ doc, docUrl }) => (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {doc.icon}
          <p className="font-medium text-sm">
            {doc.label}
            {doc.required && <span className="text-red-500 text-xs ml-1">*</span>}
          </p>
        </div>
        {docUrl ? (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Uploaded</span>
        ) : (
          <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Missing</span>
        )}
      </div>
      {docUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewingDoc(docUrl)}
          className="w-full mt-2 text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          View Document
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl">Driver Documents Review</DialogTitle>
          <p className="text-xs sm:text-sm text-gray-500">
            Review documents for {driver.full_name || driver.name} ({driver.email})
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Driver Info - Mobile Friendly */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Driver Information
            </h3>
            
            {/* Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Full Name</p>
                  <p className="font-medium text-sm">{driver.full_name || driver.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Email</p>
                  <p className="font-medium text-sm break-all">{driver.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Phone</p>
                  <p className="font-medium text-sm">{driver.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500">Applied On</p>
                  <p className="font-medium text-sm">
                    {driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List - Mobile Responsive */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-3">Submitted Documents</h3>
            
            {/* Mobile View - Card Grid */}
            {mobileView ? (
              <div className="space-y-2">
                {documents.map(doc => {
                  const docUrl = getDocumentUrl(doc.key);
                  return (
                    <MobileDocumentCard key={doc.key} doc={doc} docUrl={docUrl} />
                  );
                })}
              </div>
            ) : (
              /* Desktop View - Table Layout */
              <div className="space-y-2">
                {documents.map(doc => {
                  const docUrl = getDocumentUrl(doc.key);
                  return (
                    <div key={doc.key} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {doc.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
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
                          onClick={() => {
                            console.log("Opening document:", docUrl);
                            setViewingDoc(docUrl);
                          }}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Document
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vehicle Information */}
          {(driver.car_info || driver.car_make || driver.license_plate) && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle Information
              </h3>
              <div className="space-y-1 text-sm">
                {driver.car_info && <p className="text-gray-600">{driver.car_info}</p>}
                {driver.car_make && (
                  <p className="text-gray-600">
                    {driver.car_make} {driver.car_model || ''} {driver.car_year || ''}
                  </p>
                )}
                {driver.license_plate && (
                  <p className="text-gray-600">License Plate: {driver.license_plate}</p>
                )}
                {driver.car_color && <p className="text-gray-600">Color: {driver.car_color}</p>}
              </div>
            </div>
          )}

          {/* Action Buttons - Mobile Friendly */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-green hover:bg-green/90 text-white order-2 sm:order-1"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Processing...' : 'Approve Driver'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading}
              variant="destructive"
              className="flex-1 order-1 sm:order-2"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Driver
            </Button>
          </div>

          {/* Warning Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">Important</p>
                <p className="text-xs text-amber-700">
                  Approved drivers will be able to accept delivery requests. Rejected drivers will need to re-apply.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Document Preview Dialog - Mobile Friendly */}
        {viewingDoc && (
          <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Document Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {isImage(viewingDoc) && (
                  <img 
                    src={viewingDoc} 
                    alt="Document" 
                    className="w-full rounded-lg object-contain max-h-[50vh]"
                    onError={(e) => {
                      console.error("Image failed to load:", viewingDoc);
                      e.target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Image+Not+Found';
                    }}
                  />
                )}
                {isPDF(viewingDoc) && (
                  <iframe 
                    src={viewingDoc} 
                    className="w-full h-96 rounded-lg"
                    title="PDF Preview"
                  />
                )}
                {!isImage(viewingDoc) && !isPDF(viewingDoc) && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Unable to preview document</p>
                    <p className="text-xs text-gray-400 mt-1">Click download to view the file</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (viewingDoc) window.open(viewingDoc, '_blank');
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    onClick={() => setViewingDoc(null)}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}