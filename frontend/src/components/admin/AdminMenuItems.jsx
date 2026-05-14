import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';

const categories = ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks', 'Combos', 'Specials'];

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  category: 'Mains',
  restaurant_id: '',
  image_url: '',
};

export default function AdminMenuItems({ restaurants = [] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const queryClient = useQueryClient();

 // Fetch menu items from API
const { data: menuItems = [], isLoading } = useQuery({
  queryKey: ['adminMenuItems'],
  queryFn: async () => {
    try {
      const response = await api.get('/menu-items');
      console.log('Menu items response:', response);
      return response || [];
    } catch (err) {
      console.error('Error fetching menu items:', err);
      return [];
    }
  },
});

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.name || '-';
  };

  const handleSave = async () => {
    if (!form.name || !form.restaurant_id || form.price <= 0) {
      toast.error('Name, restaurant, and valid price are required');
      return;
    }

    try {
      if (editId) {
        await api.put(`/menu-items/${editId}`, form);
        toast.success('Menu item updated successfully');
      } else {
        await api.post('/menu-items', form);
        toast.success('Menu item created successfully');
      }
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save menu item');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price || 0,
      category: item.category || 'Mains',
      restaurant_id: item.restaurant_id || '',
      image_url: item.image_url || '',
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
      } catch (error) {
        console.error(error);
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
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-lg">Menu Items</h3>
          <p className="text-sm text-gray-500">{menuItems.length} total items</p>
        </div>
        
        <Dialog open={open} onOpenChange={(v) => { 
          setOpen(v); 
          if (!v) { 
            setForm(emptyForm); 
            setEditId(null); 
          } 
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green hover:bg-green/600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
                  placeholder="Item description" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (R) *</label>
                  <Input 
                    type="number" 
                    step="0.01"
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input 
                  placeholder="https://example.com/image.jpg" 
                  value={form.image_url} 
                  onChange={e => setForm({ ...form, image_url: e.target.value })} 
                />
              </div>
              
              <Button onClick={handleSave} className="w-full bg-navy text-white">
                {editId ? 'Update Menu Item' : 'Create Menu Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menuItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No menu items found. Click "Add Menu Item" to create one.
                </TableCell>
              </TableRow>
            ) : (
              menuItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm">{getRestaurantName(item.restaurant_id)}</TableCell>
                  <TableCell className="text-sm">{item.category || '-'}</TableCell>
                  <TableCell className="font-semibold">R{item.price?.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500" 
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