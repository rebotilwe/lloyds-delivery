import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Upload, 
  Image as ImageIcon,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminRestaurants({ restaurants, onRefresh }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    phone: '',
    image_url: '',
    rating: '',
    delivery_fee: '',
    estimated_delivery_time: ''
  });

  const handleOpenModal = (restaurant = null) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        cuisine_type: restaurant.cuisine_type || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        image_url: restaurant.image_url || '',
        rating: restaurant.rating || '',
        delivery_fee: restaurant.delivery_fee || '',
        estimated_delivery_time: restaurant.estimated_delivery_time || ''
      });
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: '',
        description: '',
        cuisine_type: '',
        address: '',
        phone: '',
        image_url: '',
        rating: '',
        delivery_fee: '',
        estimated_delivery_time: ''
      });
    }
    setIsModalOpen(true);
  };

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

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update form data with the uploaded image URL
      setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
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

  const handleSubmit = async () => {
    if (!formData.name || !formData.cuisine_type) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        cuisine_type: formData.cuisine_type,
        address: formData.address,
        phone: formData.phone,
        image_url: formData.image_url,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        delivery_fee: formData.delivery_fee ? parseFloat(formData.delivery_fee) : 0,
        estimated_delivery_time: formData.estimated_delivery_time
      };

      if (editingRestaurant) {
        await api.put(`/restaurants/${editingRestaurant.id}`, payload);
        toast.success('Restaurant updated successfully');
      } else {
        await api.post('/restaurants', payload);
        toast.success('Restaurant added successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      if (onRefresh) onRefresh();
      setIsModalOpen(false);
      setEditingRestaurant(null);
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      await api.delete(`/restaurants/${deleteTarget.id}`);
      toast.success('Restaurant deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      if (onRefresh) onRefresh();
      setDeleteTarget(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Restaurants</h2>
        <Button onClick={() => handleOpenModal()} className="bg-green text-white">
          <Plus className="w-4 h-4 mr-1" />
          Add Restaurant
        </Button>
      </div>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(restaurant => (
          <div key={restaurant.id} className="border rounded-lg overflow-hidden bg-white">
            <div className="aspect-video relative">
              <img 
                src={restaurant.image_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'} 
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <h3 className="font-semibold">{restaurant.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{restaurant.cuisine_type}</p>
              <p className="text-xs text-gray-500">{restaurant.address}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm font-bold text-green">
                  R{restaurant.delivery_fee || 0} delivery
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(restaurant)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteTarget(restaurant)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Restaurant Image</Label>
              <div className="flex gap-3 items-start">
                {/* Image Preview */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {formData.image_url ? (
                    <img 
                      src={formData.image_url} 
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
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
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
              {formData.image_url && !uploadingImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove Image
                </Button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Restaurant Name *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Burger Palace"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your restaurant..."
                rows={3}
              />
            </div>

            {/* Cuisine Type */}
            <div className="space-y-2">
              <Label>Cuisine Type *</Label>
              <Input
                value={formData.cuisine_type}
                onChange={e => setFormData({ ...formData, cuisine_type: e.target.value })}
                placeholder="e.g., Burgers, Pizza, Sushi"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Restaurant address"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="4.5"
                />
              </div>

              {/* Delivery Fee */}
              <div className="space-y-2">
                <Label>Delivery Fee (R)</Label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={e => setFormData({ ...formData, delivery_fee: e.target.value })}
                  placeholder="15"
                />
              </div>
            </div>

            {/* Estimated Delivery Time */}
            <div className="space-y-2">
              <Label>Estimated Delivery Time</Label>
              <Input
                value={formData.estimated_delivery_time}
                onChange={e => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
                placeholder="e.g., 20-30 min"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-green text-white">
              {loading ? 'Saving...' : (editingRestaurant ? 'Update' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}