import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef(null);
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

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.name || '-';
  };

 // Handle image upload
const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Please upload an image file');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image must be less than 5MB');
    return;
  }

  setUploadingImage(true);

  const uploadFormData = new FormData();
  uploadFormData.append('image', file);

  try {
    // Use the same endpoint as restaurant images
    const response = await fetch('https://lloyds-delivery.onrender.com/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    // Handle the response format from your backend
    // Your backend returns: { success: true, imageUrl: "/uploads/restaurants/filename.jpg" }
    let fullImageUrl = data.imageUrl;
    
    // If it's a relative path, convert to full URL
    if (fullImageUrl && fullImageUrl.startsWith('/uploads')) {
      fullImageUrl = `https://lloyds-delivery.onrender.com${fullImageUrl}`;
    }
    
    // Update form data with the uploaded image URL
    setForm(prev => ({ ...prev, image_url: fullImageUrl }));
    toast.success('Image uploaded successfully');

  } catch (error) {
    console.error('Upload error:', error);
    toast.error(error.message || 'Failed to upload image');
  } finally {
    setUploadingImage(false);
    // Clear file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
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
            <Button size="sm" className="bg-green hover:bg-green/90 text-white">
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
              
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium mb-1">Item Image</label>
                <div className="flex gap-4 items-start">
                  {/* Image Preview */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                    {form.image_url ? (
                      <img 
                        src={form.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="menu-item-image-upload"
                    />
                    <label htmlFor="menu-item-image-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        disabled={uploadingImage}
                        asChild
                      >
                        <span>
                          {uploadingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Image
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG or GIF. Max 5MB
                    </p>
                  </div>
                </div>
                {form.image_url && !uploadingImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 mt-2"
                    onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove Image
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
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
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No menu items found. Click "Add Menu Item" to create one.
                </TableCell>
              </TableRow>
            ) : (
              menuItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm">{getRestaurantName(item.restaurant_id)}</TableCell>
                  <TableCell className="text-sm">{item.category || '-'}</TableCell>
                  <TableCell className="font-semibold text-green">
                    R{typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                  </TableCell>
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