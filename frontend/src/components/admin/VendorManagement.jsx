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
  Shield,
  Award,
  Clock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function VendorManagement({ vendors = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
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

  // Safety checks - use empty array if vendors is undefined
  const safeVendors = vendors || [];
  
  const pendingVendors = safeVendors.filter(v => v.vendor_status === 'pending' || !v.vendor_status);
  const approvedVendors = safeVendors.filter(v => v.vendor_status === 'approved');
  const suspendedVendors = safeVendors.filter(v => v.vendor_status === 'suspended');
  const rejectedVendors = safeVendors.filter(v => v.vendor_status === 'rejected');

  const filteredVendors = safeVendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
        <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
          <p className="text-lg sm:text-xl font-bold text-gray-600">{rejectedVendors.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">Rejected</p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                    {getStatusBadge(vendor.vendor_status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                  {vendor.restaurant_name && (
                    <p className="text-xs text-gray-400 truncate">🏪 {vendor.restaurant_name}</p>
                  )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                    {getStatusBadge(vendor.vendor_status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                  {vendor.restaurant_name && (
                    <p className="text-xs text-gray-400 truncate">🏪 {vendor.restaurant_name}</p>
                  )}
                </div>
                <div className="flex gap-2 items-center flex-wrap">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                    {getStatusBadge(vendor.vendor_status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                </div>
                <div className="flex gap-2">
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

      {/* Rejected Vendors */}
      {rejectedVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs sm:text-sm mb-2">Rejected Vendors ({rejectedVendors.length})</h3>
          <div className="space-y-2">
            {rejectedVendors.map(vendor => (
              <div key={vendor.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{vendor.name || vendor.full_name}</p>
                    {getStatusBadge(vendor.vendor_status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                  {vendor.vendor_rejection_reason && (
                    <p className="text-xs text-red-500 truncate">Reason: {vendor.vendor_rejection_reason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => { setSelectedVendor(vendor); setShowDetails(true); }}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
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
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-500" />
              Vendor Details
            </DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(selectedVendor.vendor_status)}
                </div>
                {selectedVendor.vendor_status === 'pending' && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Submitted: {formatDate(selectedVendor.created_at)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
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

              {selectedVendor.restaurant_name && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-gray-500">Restaurant</p>
                    <p className="text-sm">{selectedVendor.restaurant_name}</p>
                    {selectedVendor.restaurant_address && (
                      <p className="text-xs text-gray-400">{selectedVendor.restaurant_address}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedVendor.business_registration_number && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-gray-500">Business Registration</p>
                    <p className="text-sm">{selectedVendor.business_registration_number}</p>
                  </div>
                </div>
              )}

              {/* Document Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Documents
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedVendor.business_license && (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">✅ Business License</Badge>
                  )}
                  {selectedVendor.health_certificate && (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">✅ Health Certificate</Badge>
                  )}
                  {selectedVendor.halaal_certificate && (
                    <Badge className="bg-blue-100 text-blue-800 text-[10px]">✅ Halaal Certificate</Badge>
                  )}
                  {selectedVendor.bank_confirmation && (
                    <Badge className="bg-purple-100 text-purple-800 text-[10px]">✅ Bank Confirmation</Badge>
                  )}
                  {!selectedVendor.business_license && !selectedVendor.health_certificate && (
                    <span className="text-xs text-gray-400">No documents uploaded</span>
                  )}
                </div>
              </div>

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

              {selectedVendor.vendor_rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{selectedVendor.vendor_rejection_reason}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  onClick={() => handleEditVendor(selectedVendor)}
                  className="flex-1 bg-blue-600 text-white text-sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
                {selectedVendor.vendor_status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => updateVendorStatus(selectedVendor.id, 'approved')} 
                      className="flex-1 bg-green text-white text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => updateVendorStatus(selectedVendor.id, 'rejected')} 
                      variant="destructive" 
                      className="flex-1 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedVendor.vendor_status === 'approved' && (
                  <Button 
                    onClick={() => updateVendorStatus(selectedVendor.id, 'suspended')} 
                    variant="destructive" 
                    className="flex-1 text-sm"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend
                  </Button>
                )}
                {selectedVendor.vendor_status === 'suspended' && (
                  <Button 
                    onClick={() => updateVendorStatus(selectedVendor.id, 'approved')} 
                    className="flex-1 bg-green text-white text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reinstate
                  </Button>
                )}
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