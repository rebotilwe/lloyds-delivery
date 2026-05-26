import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function VendorManagement({ vendors, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);

  const pendingVendors = vendors.filter(v => v.vendor_status === 'pending' || !v.vendor_status);
  const approvedVendors = vendors.filter(v => v.vendor_status === 'approved');
  const suspendedVendors = vendors.filter(v => v.vendor_status === 'suspended');

  const filteredVendors = vendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm)
  );
const updateVendorStatus = async (vendorId, status) => {
  setUpdating(true);
  try {
    // Use the dedicated vendor-status endpoint
    await api.put(`/users/${vendorId}/vendor-status`, { vendor_status: status });
    toast.success(`Vendor ${status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'rejected'} successfully`);
    onRefresh();
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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <p className="text-xl font-bold text-yellow-600">{pendingVendors.length}</p>
          <p className="text-xs text-gray-500">Pending Approval</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-xl font-bold text-green-600">{approvedVendors.length}</p>
          <p className="text-xs text-gray-500">Active Vendors</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-xl font-bold text-red-600">{suspendedVendors.length}</p>
          <p className="text-xs text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search vendors by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Vendors */}
      {pendingVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Pending Approval ({pendingVendors.length})</h3>
          <div className="space-y-2">
            {pendingVendors.map(vendor => (
              <div key={vendor.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 border rounded-lg bg-yellow-50/30">
                <div>
                  <p className="font-medium text-sm">{vendor.name || vendor.full_name}</p>
                  <p className="text-xs text-gray-500">{vendor.email}</p>
                  {vendor.phone && <p className="text-xs text-gray-400">{vendor.phone}</p>}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => { setSelectedVendor(vendor); setShowDetails(true); }}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Review
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateVendorStatus(vendor.id, 'approved')}
                    className="bg-green text-white text-xs"
                    disabled={updating}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => updateVendorStatus(vendor.id, 'rejected')}
                    className="text-xs"
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
      <div>
        <h3 className="font-semibold text-sm mb-2">Active Vendors ({approvedVendors.length})</h3>
        <div className="space-y-2">
          {filteredVendors.filter(v => v.vendor_status === 'approved').map(vendor => (
            <div key={vendor.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{vendor.name || vendor.full_name}</p>
                <p className="text-xs text-gray-500">{vendor.email}</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">Active</Badge>
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

      {/* Suspended Vendors */}
      {suspendedVendors.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Suspended Vendors ({suspendedVendors.length})</h3>
          <div className="space-y-2">
            {suspendedVendors.map(vendor => (
              <div key={vendor.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{vendor.name || vendor.full_name}</p>
                  <p className="text-xs text-gray-500">{vendor.email}</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => updateVendorStatus(vendor.id, 'approved')}
                  className="bg-green text-white text-xs"
                >
                  Reinstate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Store className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Business Name</p>
                  <p className="font-medium">{selectedVendor.name || selectedVendor.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p>{selectedVendor.email}</p>
                </div>
              </div>
              {selectedVendor.phone && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p>{selectedVendor.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => updateVendorStatus(selectedVendor.id, 'approved')} className="flex-1 bg-green text-white">
                  Approve Vendor
                </Button>
                <Button onClick={() => updateVendorStatus(selectedVendor.id, 'rejected')} variant="destructive" className="flex-1">
                  Reject Vendor
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}