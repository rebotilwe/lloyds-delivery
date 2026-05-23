import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';

const categories = ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks', 'Combos', 'Specials'];

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  category: 'Mains',
  restaurant_id: '',
};

export default function AdminMenuItems({ restaurants = [] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch menu items from API
  const { data: menuItems = [], isLoading, refetch } = useQuery({
    queryKey: ['adminMenuItems'],
    queryFn: async () => {
      try {
        const response = await api.get('/menu-items');
        console.log('Menu items response:', response);
        const items = Array.isArray(response) ? response : [];
        return items.map(item => ({
          ...item,
          price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0)
        }));
      } catch (err) {
        console.error('Error fetching menu items:', err);
        return [];
      }
    },
  });

  // Filter menu items by search
  const filteredMenuItems = menuItems.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRestaurantName(item.restaurant_id)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.name || '-';
  };

  const handleSave = async () => {
    if (!form.name || !form.restaurant_id || form.price <= 0) {
      toast.error('Name, restaurant, and valid price are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        restaurant_id: parseInt(form.restaurant_id)
      };

      if (editId) {
        await api.put(`/menu-items/${editId}`, payload);
        toast.success('Menu item updated successfully');
      } else {
        await api.post('/menu-items', payload);
        toast.success('Menu item created successfully');
      }
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      await refetch();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
      category: item.category || 'Mains',
      restaurant_id: item.restaurant_id || '',
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/menu-items/${id}`);
        toast.success('Menu item deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
        queryClient.invalidateQueries({ queryKey: ['menu-items'] });
        await refetch();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.message || 'Failed to delete menu item');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading menu items...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header - Mobile Friendly */}
      <div className="p-3 sm:p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg">Menu Items</h3>
            <p className="text-xs text-gray-500">{menuItems.length} total items</p>
          </div>
          
          {/* Search Bar - Mobile Friendly */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {/* Add Button - Full width on mobile */}
        <div className="mt-3 sm:mt-0 sm:absolute sm:right-6">
          <Dialog open={open} onOpenChange={(v) => { 
            setOpen(v); 
            if (!v) { 
              setForm(emptyForm); 
              setEditId(null); 
            } 
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto bg-green hover:bg-green/90 text-white text-sm">
                <Plus className="w-4 h-4 mr-1" /> Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Restaurant *</label>
                  <Select 
                    value={form.restaurant_id} 
                    onValueChange={val => setForm({ ...form, restaurant_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Item Name *</label>
                  <Input 
                    placeholder="e.g., Classic Cheeseburger" 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea 
                    placeholder="Item description (e.g., Grilled chicken breast with lettuce and mayo)" 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (R) *</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      min="0"
                      placeholder="0.00" 
                      value={form.price} 
                      onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Select 
                      value={form.category} 
                      onValueChange={val => setForm({ ...form, category: val })}
                    >
                      <SelectTrigger>
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
                
                <Button onClick={handleSave} disabled={saving} className="w-full bg-navy text-white">
                  {saving ? 'Saving...' : (editId ? 'Update Menu Item' : 'Create Menu Item')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table - Horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Name</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Restaurant</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Category</TableHead>
              <TableHead className="whitespace-nowrap hidden lg:table-cell">Description</TableHead>
              <TableHead className="whitespace-nowrap">Price</TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenuItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  {searchTerm ? 'No menu items match your search' : 'No menu items found. Click "Add Menu Item" to create one.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMenuItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                  <TableCell className="text-xs text-gray-500 hidden sm:table-cell">{getRestaurantName(item.restaurant_id)}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{item.category || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[200px] truncate hidden lg:table-cell">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell className="font-semibold text-green text-sm whitespace-nowrap">
                    R{typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 sm:h-8 sm:w-8" 
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" 
                        onClick={() => handleDelete(item.id, item.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}