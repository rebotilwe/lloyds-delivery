import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Eye, 
  Search, 
  CheckCircle, 
  XCircle, 
  Ban,
  Store,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  X,
  Edit,
  Save,
  User,
  CreditCard,
  Building2,
  FileText,
  Upload,
  Download,
  Shield,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

// Restaurant document types
const restaurantDocumentTypes = [
  { key: 'health_certificate', label: 'Health & Safety Certificate', icon: Shield, required: true },
  { key: 'halaal_certificate', label: 'Halaal Certificate', icon: Award, required: false },
  { key: 'business_license', label: 'Business License', icon: FileText, required: true },
  { key: 'vat_registration', label: 'VAT Registration', icon: FileText, required: false },
  { key: 'bank_confirmation', label: 'Bank Confirmation Letter', icon: CreditCard, required: true },
];

export default function VendorManagement({ vendors = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch_code: ''
  });
  const [restaurantDocuments, setRestaurantDocuments] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);

  // Safety checks - use empty array if vendors is undefined
  const safeVendors = vendors || [];
  
  const pendingVendors = safeVendors.filter(v => v.vendor_status === 'pending' || !v.vendor_status);
  const approvedVendors = safeVendors.filter(v => v.vendor_status === 'approved');
  const suspendedVendors = safeVendors.filter(v => v.vendor_status === 'suspended');

  const filteredVendors = safeVendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm)
  );

  const updateVendorStatus = async (vendorId, status) => {
    setUpdating(true);
    try {
      await api.put(`/users/${vendorId}/vendor-status`, { vendor_status: status });
      toast.success(`Vendor ${status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'rejected'} successfully`);
      if (onRefresh) onRefresh();
      setShowDetails(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update vendor status');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setEditForm({
      name: vendor.name || vendor.full_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      bank_name: vendor.bank_name || '',
      bank_account_name: vendor.bank_account_name || '',
      bank_account_number: vendor.bank_account_number || '',
      bank_branch_code: vendor.bank_branch_code || ''
    });
    setShowEditModal(true);
  };

  const saveVendorDetails = async () => {
    if (!editForm.name || !editForm.email) {
      toast.error('Name and email are required');
      return;
    }
    
    setUpdating(true);
    try {
      await api.put(`/users/${selectedVendor.id}`, editForm);
      toast.success('Vendor details updated successfully');
      setShowEditModal(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor details');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewDocuments = (vendor) => {
    setSelectedVendor(vendor);
    // Load existing documents from vendor data
    const docs = {};
    restaurantDocumentTypes.forEach(doc => {
      docs[doc.key] = vendor[doc.key] || null;
    });
    setRestaurantDocuments(docs);
    setShowDocumentsModal(true);
  };

  // FIXED: Better error handling and debugging for document upload
  const handleDocumentUpload = async (documentKey, file) => {
    if (!file) {
      toast.error('No file selected');
      return;
    }
    
    setUploading(true);
    setUploadingFor(documentKey);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_key', documentKey);
    
    console.log('Uploading document:', {
      documentKey,
      vendorId: selectedVendor?.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      const response = await api.post(`/vendor/admin/upload-document/${selectedVendor.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });
      
      console.log('Upload response:', response.data);
      
      if (response.data.url) {
        setRestaurantDocuments(prev => ({ ...prev, [documentKey]: response.data.url }));
        toast.success(`${restaurantDocumentTypes.find(d => d.key === documentKey)?.label} uploaded successfully`);
        if (onRefresh) onRefresh();
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      console.error('Upload error details:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.status === 404) {
        toast.error('Upload endpoint not found. Please check if the backend route is configured.');
      } else if (error.response?.status === 401) {
        toast.error('Unauthorized. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to upload documents.');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Upload timed out. Please try again with a smaller file.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
      setUploadingFor(null);
    }
  };

  const getDocumentUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL || 'https://lloyds-delivery.onrender.com'}${url}`;
    return url;
  };

  return (
    <div className="space-y-4">
      {/* Stats - Responsive */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
          <p className="text-lg sm:text-xl font-bold text-yellow-600">{pendingVendors.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">Pending</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
          <p className="text-lg sm:text-xl font-bold text-green-600">{approvedVendors.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">Active</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
          <p className="text-lg sm:text-xl font-bold text-red-600">{suspendedVendors.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Search with clear button */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-8 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Pending Vendors */}
      {pendingVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs sm:text-sm mb-2">Pending Approval ({pendingVendors.length})</h3>
          <div className="space-y-2">
            {pendingVendors.map(vendor => (
              <div key={vendor.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 border rounded-lg bg-yellow-50/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                  {vendor.phone && <p className="text-xs text-gray-400 truncate">{vendor.phone}</p>}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => { setSelectedVendor(vendor); setShowDetails(true); }}
                    className="text-xs flex-1 sm:flex-none"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Review
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateVendorStatus(vendor.id, 'approved')}
                    className="bg-green text-white text-xs flex-1 sm:flex-none"
                    disabled={updating}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => updateVendorStatus(vendor.id, 'rejected')}
                    className="text-xs flex-1 sm:flex-none"
                    disabled={updating}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Vendors */}
      {approvedVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs sm:text-sm mb-2">Active Vendors ({approvedVendors.length})</h3>
          <div className="space-y-2">
            {filteredVendors.filter(v => v.vendor_status === 'approved').map(vendor => (
              <div key={vendor.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                  {vendor.restaurant_name && (
                    <p className="text-xs text-gray-400 truncate">🏪 {vendor.restaurant_name}</p>
                  )}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs whitespace-nowrap">Active</Badge>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleViewDocuments(vendor)}
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" /> Documents
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEditVendor(vendor)}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => { setSelectedVendor(vendor); setShowDetails(true); }}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => updateVendorStatus(vendor.id, 'suspended')}
                    className="text-xs text-red-500"
                  >
                    <Ban className="w-3 h-3 mr-1" /> Suspend
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspended Vendors */}
      {suspendedVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs sm:text-sm mb-2">Suspended Vendors ({suspendedVendors.length})</h3>
          <div className="space-y-2">
            {suspendedVendors.map(vendor => (
              <div key={vendor.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-red-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleViewDocuments(vendor)}
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" /> Documents
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEditVendor(vendor)}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateVendorStatus(vendor.id, 'approved')}
                    className="bg-green text-white text-xs"
                  >
                    Reinstate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeVendors.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <Store className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-sm text-gray-500">No vendors found</p>
        </div>
      )}

      {/* Vendor Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-500">Business Name</p>
                  <p className="font-medium text-sm truncate">{selectedVendor.name || selectedVendor.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-gray-500">Email</p>
                  <p className="text-sm break-all">{selectedVendor.email}</p>
                </div>
              </div>
              {selectedVendor.phone && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-gray-500">Phone</p>
                    <p className="text-sm">{selectedVendor.phone}</p>
                  </div>
                </div>
              )}
              {selectedVendor.address && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-gray-500">Address</p>
                    <p className="text-sm break-all">{selectedVendor.address}</p>
                  </div>
                </div>
              )}
              {(selectedVendor.bank_name || selectedVendor.bank_account_number) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Bank Details
                  </p>
                  {selectedVendor.bank_name && <p className="text-sm">Bank: {selectedVendor.bank_name}</p>}
                  {selectedVendor.bank_account_name && <p className="text-sm">Account: {selectedVendor.bank_account_name}</p>}
                  {selectedVendor.bank_account_number && (
                    <p className="text-sm">Number: ••••{selectedVendor.bank_account_number.slice(-4)}</p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  onClick={() => handleViewDocuments(selectedVendor)}
                  className="flex-1 bg-purple-600 text-white text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Documents
                </Button>
                <Button 
                  onClick={() => handleEditVendor(selectedVendor)}
                  className="flex-1 bg-blue-600 text-white text-sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                {selectedVendor.vendor_status !== 'approved' && (
                  <Button 
                    onClick={() => updateVendorStatus(selectedVendor.id, 'approved')} 
                    className="flex-1 bg-green text-white text-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Vendor
                  </Button>
                )}
                {selectedVendor.vendor_status === 'approved' && (
                  <Button 
                    onClick={() => updateVendorStatus(selectedVendor.id, 'suspended')} 
                    variant="destructive" 
                    className="flex-1 text-sm"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend Vendor
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents Modal */}
      <Dialog open={showDocumentsModal} onOpenChange={setShowDocumentsModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Restaurant Documents
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-1">
              {selectedVendor?.name} - Upload required certificates and documents
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {restaurantDocumentTypes.map((doc) => {
              const Icon = doc.icon;
              const docUrl = getDocumentUrl(restaurantDocuments[doc.key]);
              const isUploaded = !!docUrl;
              const isUploadingThis = uploadingFor === doc.key;
              
              return (
                <div key={doc.key} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    {isUploaded && (
                      <Badge variant="outline" className="text-green-600 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Uploaded
                      </Badge>
                    )}
                  </div>
                 <div className="flex gap-2">
  <input
    id={`file-${doc.key}`}
    type="file"
    className="hidden"
    accept=".pdf,.jpg,.jpeg,.png"
    disabled={uploading}
    onChange={(e) => {
      const file = e.target.files?.[0];

      console.log("Selected file:", file);

      if (file) {
        handleDocumentUpload(doc.key, file);
      }
    }}
  />

  <Button
    type="button"
    size="sm"
    variant="outline"
    className="flex-1"
    disabled={uploading}
    onClick={() => {
      console.log("Upload clicked:", doc.key);

      const input = document.getElementById(`file-${doc.key}`);

      if (!input) {
        console.error("File input not found:", `file-${doc.key}`);
        return;
      }

      input.click();
    }}
  >
    {isUploadingThis ? (
      <div className="flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-green rounded-full animate-spin mr-2" />
        Uploading...
      </div>
    ) : (
      <>
        <Upload className="w-3 h-3 mr-1" />
        {isUploaded ? "Replace" : "Upload"}
      </>
    )}
  </Button>

  {isUploaded && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => window.open(docUrl, "_blank")}
    >
      <Download className="w-3 h-3 mr-1" />
      View
    </Button>
  )}
</div>
                  
                  {!isUploaded && doc.required && (
                    <p className="text-xs text-red-500 mt-1">
                      Required document - please upload
                    </p>
                  )}
                </div>
              );
            })}
            
            <div className="bg-blue-50 p-3 rounded-lg mt-2">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                All documents will be reviewed by admin before vendor approval
              </p>
            </div>
            
            <Button onClick={() => setShowDocumentsModal(false)} className="w-full bg-green text-white">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {viewingDoc && (
            <div>
              {viewingDoc.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                <img src={viewingDoc} alt="Document" className="w-full rounded-lg object-contain" style={{ maxHeight: '60vh' }} />
              ) : (
                <iframe src={viewingDoc} className="w-full rounded-lg" style={{ height: '60vh' }} title="Document" />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => window.open(viewingDoc, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setViewingDoc(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-green" />
              Edit Vendor Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Business Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="Business name"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Email *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="vendor@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Address</Label>
              <Textarea
                value={editForm.address}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                placeholder="Business address"
                rows={2}
                className="mt-1"
              />
            </div>
            
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Bank Details (for payouts)
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm({...editForm, bank_name: e.target.value})}
                    placeholder="e.g., Capitec, FNB, Standard Bank"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Holder Name</Label>
                  <Input
                    value={editForm.bank_account_name}
                    onChange={(e) => setEditForm({...editForm, bank_account_name: e.target.value})}
                    placeholder="Name on the account"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input
                    value={editForm.bank_account_number}
                    onChange={(e) => setEditForm({...editForm, bank_account_number: e.target.value})}
                    placeholder="Account number"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Branch Code</Label>
                  <Input
                    value={editForm.bank_branch_code}
                    onChange={(e) => setEditForm({...editForm, bank_branch_code: e.target.value})}
                    placeholder="Branch code (optional)"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={saveVendorDetails} disabled={updating} className="flex-1 bg-green text-white">
                {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
              <Button onClick={() => setShowEditModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}