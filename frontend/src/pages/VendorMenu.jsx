import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Search, X, Clock, CheckCircle, XCircle, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';

const CLOUDINARY_CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'lloyds_menu_items';

const categories = [
  'Starters', 'Mains', 'Burgers', 'Pizzas', 'Sides',
  'Desserts', 'Drinks', 'Combos', 'Specials'
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    case 'pending':  return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
    case 'rejected': return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    default: return null;
  }
};

// ── FIX #5: Image upload component ─────────────────────────────────────────
// Previously there was no image field at all. This uploads directly to
// Cloudinary (unsigned preset) and returns the secure_url back to the form.
function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { setError('Image must be under 5MB'); return; }

    setError(null);
    setUploading(true);

    // Show instant local preview while uploading
    const localPreview = URL.createObjectURL(file);
    onChange(localPreview); // optimistic

    try {
      if (!CLOUDINARY_CLOUD_NAME) {
        // No Cloudinary configured — keep local preview and warn
        toast.warning('Cloudinary not configured. Image preview only, URL not saved.');
        setUploading(false);
        return;
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      fd.append('folder', 'lloyds/menu');

      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');

      onChange(data.secure_url);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
      onChange(''); // revert
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemove = () => { onChange(''); if (inputRef.current) inputRef.current.value = ''; setError(null); };

  return (
    <div className="space-y-1.5">
      <Label>Item Image</Label>
      {value ? (
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value} alt="Menu item" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => e.preventDefault()}
          className="w-full h-36 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-green hover:bg-green/5 transition"
        >
          {uploading ? (
            <><Loader2 className="w-6 h-6 text-green animate-spin mb-1" /><p className="text-xs text-green font-medium">Uploading...</p></>
          ) : (
            <><Upload className="w-6 h-6 text-gray-400 mb-1" /><p className="text-xs text-gray-600 font-medium">Click or drag image here</p><p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · max 5MB</p></>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

export default function VendorMenu() {
  const { socket, online } = useSocket();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formData, setFormData]   = useState({
    name:        '',
    description: '',
    price:       '',
    category:    'Mains',
    image_url:   '',    // ← added
  });
  const queryClient = useQueryClient();

  useEffect(() => { fetchMenuItems(); }, []);

  useEffect(() => {
    if (socket && online) {
      socket.on('menu-item-approved', (data) => { toast.success(`✅ ${data.message}`); fetchMenuItems(); });
      socket.on('menu-item-rejected', (data) => { toast.error(`❌ ${data.message}`); fetchMenuItems(); });
      return () => { socket.off('menu-item-approved'); socket.off('menu-item-rejected'); };
    }
  }, [socket, online]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/menu');
      if (!Array.isArray(response.data)) throw new Error("Invalid menu response from server");
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu items');
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name:        item.name,
        description: item.description || '',
        price:       item.price.toString(),
        category:    item.category || 'Mains',
        image_url:   item.image_url || '',   // ← populate existing image
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: 'Mains', image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) { toast.error('Please fill in all required fields'); return; }

    setSaving(true);
    try {
      const payload = {
        name:        formData.name,
        description: formData.description,
        price:       parseFloat(formData.price),
        category:    formData.category,
        image_url:   formData.image_url || null,   // ← include in payload
      };

      if (editingItem) {
        await api.put(`/vendor/menu/${editingItem.id}`, payload);
        toast.success('Menu item updated and submitted for approval');
      } else {
        await api.post('/vendor/menu', payload);
        toast.success('Menu item submitted for approval');
      }

      setIsModalOpen(false);
      fetchMenuItems();
      queryClient.invalidateQueries({ queryKey: ['vendorMenu'] });
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (item.approval_status === 'approved') { toast.error('Cannot delete approved items. Contact admin for removal.'); return; }
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await api.delete(`/vendor/menu/${item.id}`);
        toast.success('Menu item deleted successfully');
        fetchMenuItems();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete menu item');
      }
    }
  };

  const filteredItems = (menuItems || []).filter(item =>
    item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item?.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item?.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-green" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-gray-500">Items submitted for admin approval before going live</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-green text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Menu Item
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          📝 Menu items require admin approval before they appear to customers. You'll be notified once approved or rejected.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Menu Items by Category */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No menu items found. Click "Add Menu Item" to create your first item.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition overflow-hidden">
                    <CardContent className="p-0">
                      {/* ── FIX #5: show image if it exists on the card ── */}
                      {item.image_url && (
                        <div className="w-full h-36 bg-gray-100 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      {!item.image_url && (
                        <div className="w-full h-24 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold">{item.name}</h3>
                              {getStatusBadge(item.approval_status)}
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-green font-bold mt-2">
                              R{typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price)?.toFixed(2) || '0.00'}
                            </p>
                            {item.approval_status === 'rejected' && item.rejection_reason && (
                              <p className="text-xs text-red-500 mt-1">Rejection reason: {item.rejection_reason}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => handleOpenModal(item)}
                              disabled={item.approval_status === 'pending'}
                              title={item.approval_status === 'pending' ? 'Cannot edit while pending approval' : ''}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            {editingItem && editingItem.approval_status === 'approved' && (
              <p className="text-xs text-yellow-600 mt-1">⚠️ Editing this item will require re-approval from admin</p>
            )}
          </DialogHeader>
          <div className="space-y-4 mt-4">

            <div>
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Classic Cheeseburger"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (R) *</Label>
                <Input
                  type="number" step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger className="mt-1 w-full bg-white border-gray-300">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg z-50" position="popper" sideOffset={5}>
                    {categories.map(c => (
                      <SelectItem key={c} value={c} className="text-gray-900 hover:bg-gray-100 cursor-pointer py-2 px-3">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── FIX #5: Image upload field wired into formData.image_url ── */}
            <ImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
            />

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {saving ? 'Saving...' : (editingItem ? 'Submit for Approval' : 'Add Item')}
              </Button>
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">Cancel</Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}