import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Search, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/context/SocketContext';

const categories = [
  'Starters', 'Mains', 'Burgers', 'Pizzas', 'Sides', 
  'Desserts', 'Drinks', 'Combos', 'Specials'
];

const getStatusBadge = (status) => {
  switch(status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    default:
      return null;
  }
};

export default function VendorMenu() {
  const { socket, online } = useSocket();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Socket listener for approval/rejection notifications
  useEffect(() => {
    if (socket && online) {
      socket.on('menu-item-approved', (data) => {
        toast.success(`✅ ${data.message}`);
        fetchMenuItems();
      });
      
      socket.on('menu-item-rejected', (data) => {
        toast.error(`❌ ${data.message}`);
        fetchMenuItems();
      });
      
      return () => {
        socket.off('menu-item-approved');
        socket.off('menu-item-rejected');
      };
    }
  }, [socket, online]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/menu');
      if (!Array.isArray(response.data)) {
        throw new Error("Invalid menu response from server");
      }
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
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category || 'Mains',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 'Mains',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
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
    if (item.approval_status === 'approved') {
      toast.error('Cannot delete approved items. Contact admin for removal.');
      return;
    }
    
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
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-gray-500">Items submitted for admin approval before going live</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-green text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          📝 Menu items require admin approval before they appear to customers. 
          You'll be notified once approved or rejected.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
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
                  <Card key={item.id} className="hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            {getStatusBadge(item.approval_status)}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                          )}
                          <p className="text-green font-bold mt-2">
                            R{typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price)?.toFixed(2) || '0.00'}
                          </p>
                          {item.approval_status === 'rejected' && item.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1">
                              Rejection reason: {item.rejection_reason}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenModal(item)}
                            disabled={item.approval_status === 'pending'}
                            title={item.approval_status === 'pending' ? "Cannot edit while pending approval" : ""}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            {editingItem && editingItem.approval_status === 'approved' && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Editing this item will require re-approval from admin
              </p>
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
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {saving ? 'Saving...' : (editingItem ? 'Submit for Approval' : 'Add Item')}
              </Button>
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}