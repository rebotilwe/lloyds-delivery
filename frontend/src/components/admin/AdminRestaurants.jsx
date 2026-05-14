import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';

const emptyForm = {
  name: '',
  description: '',
  cuisine_type: '',
  address: '',
  phone: '',
  image_url: '',
  rating: 0,
  delivery_fee: 0,
  estimated_delivery_time: ''
};

export default function AdminRestaurants({ onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const queryClient = useQueryClient();

// Fetch restaurants from API
const { data: restaurants = [], isLoading, error } = useQuery({
  queryKey: ['adminRestaurants'],
  queryFn: async () => {
    try {
      const response = await api.get('/restaurants');
      console.log('Restaurants API response:', response);
      // response is already the array of restaurants
      return response || [];
    } catch (err) {
      console.error('API error:', err);
      return [];
    }
  },
});

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Restaurant name is required');
      return;
    }

    try {
      if (editId) {
        await api.put(`/restaurants/${editId}`, form);
        toast.success('Restaurant updated successfully');
      } else {
        await api.post('/restaurants', form);
        toast.success('Restaurant created successfully');
      }
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save restaurant');
    }
  };

  const handleEdit = (restaurant) => {
    setForm({
      name: restaurant.name || '',
      description: restaurant.description || '',
      cuisine_type: restaurant.cuisine_type || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      image_url: restaurant.image_url || '',
      rating: restaurant.rating || 0,
      delivery_fee: restaurant.delivery_fee || 0,
      estimated_delivery_time: restaurant.estimated_delivery_time || '',
    });
    setEditId(restaurant.id);
    setOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/restaurants/${id}`);
        toast.success('Restaurant deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Failed to delete restaurant');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-lg">Restaurants</h3>
          <p className="text-sm text-gray-500">{restaurants.length} total restaurants</p>
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
              <Plus className="w-4 h-4 mr-1" /> Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Restaurant' : 'New Restaurant'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input 
                  placeholder="Restaurant name" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea 
                  placeholder="Restaurant description" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cuisine Type</label>
                  <Input 
                    placeholder="e.g., Burgers, Pizza, Sushi" 
                    value={form.cuisine_type} 
                    onChange={e => setForm({ ...form, cuisine_type: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rating</label>
                  <Input 
                    type="number" 
                    step="0.1"
                    placeholder="0-5" 
                    value={form.rating} 
                    onChange={e => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input 
                    placeholder="Street address" 
                    value={form.address} 
                    onChange={e => setForm({ ...form, address: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input 
                    placeholder="Phone number" 
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Fee (R)</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={form.delivery_fee} 
                    onChange={e => setForm({ ...form, delivery_fee: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Delivery Time</label>
                  <Input 
                    placeholder="e.g., 20-30 min" 
                    value={form.estimated_delivery_time} 
                    onChange={e => setForm({ ...form, estimated_delivery_time: e.target.value })} 
                  />
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
                {editId ? 'Update Restaurant' : 'Create Restaurant'}
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
              <TableHead>Cuisine</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Delivery Fee</TableHead>
              <TableHead>Est. Time</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No restaurants found. Click "Add Restaurant" to create one.
                </TableCell>
              </TableRow>
            ) : (
              restaurants.map(restaurant => (
                <TableRow key={restaurant.id}>
                  <TableCell className="font-medium">{restaurant.name}</TableCell>
                  <TableCell className="text-sm">{restaurant.cuisine_type || '-'}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {restaurant.rating || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>R{restaurant.delivery_fee || 0}</TableCell>
                  <TableCell>{restaurant.estimated_delivery_time || '-'}</TableCell>
                  <TableCell className="text-sm">{restaurant.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEdit(restaurant)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500" 
                        onClick={() => handleDelete(restaurant.id, restaurant.name)}
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