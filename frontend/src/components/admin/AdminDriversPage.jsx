import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { 
  Loader2, CheckCircle, XCircle, Eye, RefreshCw, Download, 
  Edit, Save, X, Upload, FileText, User, Phone, Mail, Car, 
  CreditCard, Calendar, MapPin, AlertCircle, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STATUS_COLOR = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

// Driver Documents Modal
function DriverDocumentsModal({ driver, onClose, onApprove, onReject, onRefresh }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: driver.full_name || driver.name || '',
    email: driver.email || '',
    phone: driver.phone || '',
    car_make: driver.car_make || '',
    car_model: driver.car_model || '',
    car_year: driver.car_year || '',
    license_plate: driver.license_plate || '',
    vehicle_type: driver.vehicle_type || 'bike',
    address: driver.address || '',
    bank_name: driver.bank_name || '',
    bank_account_name: driver.bank_account_name || '',
    bank_account_number: driver.bank_account_number || '',
    bank_branch_code: driver.bank_branch_code || '',
    latitude: driver.latitude || null,
    longitude: driver.longitude || null,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDocs, setNewDocs] = useState({});

  const docs = [
    { key: 'id_copy', label: 'ID / Passport', required: true },
    { key: 'pdp', label: 'PDP Licence', required: true },
    { key: 'profile_photo', label: 'Profile Photo', required: true },
    { key: 'car_license', label: 'Vehicle Licence', required: false },
    { key: 'vehicle_registration', label: 'Vehicle Registration', required: false },
  ];

  const getUrl = (key) => {
    const p = driver[key];
    if (!p) return null;
    if (p.startsWith('http')) return p;
    if (p.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL || ''}${p}`;
    return null;
  };

  const openInGoogleMaps = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, { driver_status: 'approved', is_available: 1 });
      toast.success(`${editForm.name} approved`);
      onApprove();
      onClose();
    } catch { toast.error('Failed to approve'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, { driver_status: 'rejected', is_available: 0 });
      toast.success(`${editForm.name} rejected`);
      onReject();
      onClose();
    } catch { toast.error('Failed to reject'); }
    finally { setLoading(false); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${driver.id}`, editForm);
      toast.success('Driver details updated');
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update driver');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append(fieldName, file);
    formData.append('driver_id', driver.id);
    
    try {
      const response = await api.post(`/upload/driver-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${fieldName} uploaded successfully`);
      setNewDocs(prev => ({ ...prev, [fieldName]: response.data.url }));
      onRefresh();
    } catch (err) {
      toast.error(`Failed to upload ${fieldName}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-green" />
              Driver Details
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditing(!editing)}
              disabled={saving}
            >
              {editing ? <X className="w-4 h-4 mr-1" /> : <Edit className="w-4 h-4 mr-1" />}
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
          <p className="text-sm text-slate-500">{driver.email}</p>
        </DialogHeader>

        {editing ? (
          // Edit Form
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="mt-1 text-sm"
                  type="email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" /> Vehicle Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vehicle Type</Label>
                  <select 
                    value={editForm.vehicle_type}
                    onChange={(e) => setEditForm({...editForm, vehicle_type: e.target.value})}
                    className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                  >
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">License Plate</Label>
                  <Input 
                    value={editForm.license_plate} 
                    onChange={(e) => setEditForm({...editForm, license_plate: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Make</Label>
                  <Input 
                    value={editForm.car_make} 
                    onChange={(e) => setEditForm({...editForm, car_make: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input 
                    value={editForm.car_model} 
                    onChange={(e) => setEditForm({...editForm, car_model: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Year</Label>
                  <Input 
                    value={editForm.car_year} 
                    onChange={(e) => setEditForm({...editForm, car_year: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Bank Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input 
                    value={editForm.bank_name} 
                    onChange={(e) => setEditForm({...editForm, bank_name: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Holder</Label>
                  <Input 
                    value={editForm.bank_account_name} 
                    onChange={(e) => setEditForm({...editForm, bank_account_name: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input 
                    value={editForm.bank_account_number} 
                    onChange={(e) => setEditForm({...editForm, bank_account_number: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Branch Code</Label>
                  <Input 
                    value={editForm.bank_branch_code} 
                    onChange={(e) => setEditForm({...editForm, bank_branch_code: e.target.value})}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-green text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{driver.full_name || driver.name}</span></div>
                <div><span className="text-gray-500">Phone:</span> {driver.phone || '—'}</div>
                <div><span className="text-gray-500">Vehicle:</span> {driver.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}</div>
                <div><span className="text-gray-500">License Plate:</span> {driver.license_plate || '—'}</div>
                {driver.car_make && <div><span className="text-gray-500">Car:</span> {driver.car_make} {driver.car_model} ({driver.car_year})</div>}
                {/* FIX #14 + #15: driver rating visible inside modal */}
                <div>
                  <span className="text-gray-500">Driver Rating:</span>{' '}
                  {(driver.driver_rating || driver.average_rating) ? (
                    <span className="font-semibold text-amber-600">
                      ⭐ {parseFloat(driver.driver_rating || driver.average_rating).toFixed(1)} / 5
                    </span>
                  ) : (
                    <span className="text-gray-400">No ratings yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Location - Google Maps Integration */}
            {(driver.latitude || driver.longitude) && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    Driver Location
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    onClick={() => openInGoogleMaps(driver.latitude, driver.longitude)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    View on Map
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  📍 {driver.latitude?.toFixed(6)}, {driver.longitude?.toFixed(6)}
                </p>
              </div>
            )}

            {/* Documents Section */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Driver Documents
              </h4>
              <div className="space-y-2">
                {docs.map(({ key, label, required }) => {
                  const url = getUrl(key);
                  const isUploaded = !!url;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">
                          {label} {required && <span className="text-red-500">*</span>}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isUploaded ? '✓ Uploaded' : '⚠️ Not uploaded'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {url && (
                          <Button size="sm" variant="outline" onClick={() => setViewingDoc(url)}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                        )}
                        <label className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFileUpload(key, e.target.files[0]);
                              }
                            }}
                            disabled={uploading}
                          />
                          <Button size="sm" variant="outline" as="span" disabled={uploading}>
                            <Upload className="mr-1 h-3.5 w-3.5" />
                            {uploading ? 'Uploading...' : (isUploaded ? 'Replace' : 'Upload')}
                          </Button>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bank Details (if any) */}
            {(driver.bank_name || driver.bank_account_number) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Bank Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {driver.bank_name && <div><span className="text-gray-500">Bank:</span> {driver.bank_name}</div>}
                  {driver.bank_account_name && <div><span className="text-gray-500">Account:</span> {driver.bank_account_name}</div>}
                  {driver.bank_account_number && <div><span className="text-gray-500">Number:</span> ••••{driver.bank_account_number.slice(-4)}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions (only for pending drivers) */}
        {driver.driver_status === 'pending' && !editing && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleApprove} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Approve Driver
            </Button>
            <Button onClick={handleReject} disabled={loading} variant="destructive" className="flex-1">
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </div>
        )}

        {/* Status badge for non-pending */}
        {driver.driver_status !== 'pending' && !editing && (
          <div className="flex justify-center pt-2">
            <Badge className={STATUS_COLOR[driver.driver_status]}>
              {driver.driver_status?.toUpperCase()}
            </Badge>
          </div>
        )}
      </DialogContent>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <Dialog open onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Document Preview</DialogTitle></DialogHeader>
            {/\.(jpe?g|png|gif|webp)$/i.test(viewingDoc)
              ? <img src={viewingDoc} alt="doc" className="w-full rounded-lg object-contain" style={{ maxHeight: 'min(60vh,500px)' }} />
              : <iframe src={viewingDoc} className="w-full rounded-lg" style={{ height: 'min(70vh,600px)' }} title="PDF" />
            }
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(viewingDoc, '_blank')}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button onClick={() => setViewingDoc(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

// Edit Driver Modal (for non-pending drivers)
function EditDriverModal({ driver, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    name: driver.full_name || driver.name || '',
    email: driver.email || '',
    phone: driver.phone || '',
    car_make: driver.car_make || '',
    car_model: driver.car_model || '',
    car_year: driver.car_year || '',
    license_plate: driver.license_plate || '',
    vehicle_type: driver.vehicle_type || 'bike',
    address: driver.address || '',
    bank_name: driver.bank_name || '',
    bank_account_name: driver.bank_account_name || '',
    bank_account_number: driver.bank_account_number || '',
    bank_branch_code: driver.bank_branch_code || '',
    latitude: driver.latitude || null,
    longitude: driver.longitude || null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${driver.id}`, formData);
      toast.success('Driver details updated');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error('Failed to update driver');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>Vehicle Type</Label>
            <select 
              value={formData.vehicle_type}
              onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="bike">Bike</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div>
            <Label>License Plate</Label>
            <Input value={formData.license_plate} onChange={(e) => setFormData({...formData, license_plate: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDriversPage() {
  const [selected, setSelected] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });

  const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries(['users']);
  };

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Drivers</h2>
          <p className="text-xs text-slate-400">
            {drivers.length} total · {drivers.filter(d => d.driver_status === 'pending').length} pending · 
            {drivers.filter(d => d.driver_status === 'approved').length} approved
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {drivers.map(d => (
          <div key={d.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{d.full_name || d.name}</p>
                <p className="text-xs text-slate-400">{d.email}</p>
                <p className="text-xs text-slate-400 mt-1">{d.phone || 'No phone'}</p>
                {/* FIX #14 + #15: show rating on mobile cards too */}
                {(d.driver_rating || d.average_rating) ? (
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    ⭐ {parseFloat(d.driver_rating || d.average_rating).toFixed(1)} rating
                  </p>
                ) : (
                  <p className="text-xs text-slate-300 mt-1">No ratings yet</p>
                )}
                {d.latitude && d.longitude && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location available
                  </p>
                )}
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLOR[d.driver_status] ?? 'bg-slate-100 text-slate-500')}>
                {d.driver_status ?? 'none'}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(d)}>
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingDriver(d)}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block w-full overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">Driver</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left hidden md:table-cell">Phone</th>
              <th className="whitespace-nowrap px-4 py-3 text-left hidden lg:table-cell">Vehicle</th>
              <th className="whitespace-nowrap px-4 py-3 text-left hidden lg:table-cell">Rating</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
              <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {drivers.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{d.full_name || d.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{d.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 hidden md:table-cell">{d.phone || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 hidden lg:table-cell">
                  {d.vehicle_type === 'car' ? '🚗 Car' : '🏍️ Bike'}
                  {d.license_plate && <span className="text-xs text-slate-400 ml-1">({d.license_plate})</span>}
                </td>
                {/* FIX #14 + #15: driver_rating now visible to admin */}
                <td className="whitespace-nowrap px-4 py-3 hidden lg:table-cell">
                  {d.driver_rating || d.average_rating ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      ⭐ {parseFloat(d.driver_rating || d.average_rating).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No ratings yet</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_COLOR[d.driver_status] ?? 'bg-slate-100 text-slate-500')}>
                    {d.driver_status ?? 'none'}
                  </span>
                </td>
                <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setSelected(d)}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDriver(d)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Driver Details Modal (with edit capability) */}
      {selected && (
        <DriverDocumentsModal
          driver={selected}
          onClose={() => setSelected(null)}
          onApprove={() => handleRefresh()}
          onReject={() => handleRefresh()}
          onRefresh={handleRefresh}
        />
      )}

      {/* Edit Driver Modal */}
      {editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}