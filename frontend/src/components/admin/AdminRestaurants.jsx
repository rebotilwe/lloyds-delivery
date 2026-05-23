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
  Loader2,
  Search,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Star
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
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter restaurants by search term
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('https://lloyds-delivery.onrender.com/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setFormData(prev => ({ ...prev, image_url: data.imageUrl }));
      toast.success('Image uploaded successfully');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
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

  // Mobile Restaurant Card Component
  const MobileRestaurantCard = ({ restaurant }) => (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition">
      <div className="aspect-video relative">
        <img 
          src={restaurant.image_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        {restaurant.rating && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{restaurant.rating}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm sm:text-base">{restaurant.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{restaurant.cuisine_type}</p>
        
        {/* Address - hidden on very small screens */}
        <div className="flex items-start gap-1 mt-2">
          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 line-clamp-1">{restaurant.address || 'No address'}</p>
        </div>
        
        {/* Delivery Info */}
        <div className="flex flex-wrap justify-between items-center mt-3 gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-green" />
            <span className="text-xs font-medium text-green">
              R{restaurant.delivery_fee || 0} delivery
            </span>
            {restaurant.estimated_delivery_time && (
              <>
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{restaurant.estimated_delivery_time}</span>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => handleOpenModal(restaurant)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setDeleteTarget(restaurant)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header with Search - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">Restaurants</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm w-full"
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
          <Button onClick={() => handleOpenModal()} className="bg-green text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            Add Restaurant
          </Button>
        </div>
      </div>

      {/* Restaurants Grid - Mobile Responsive */}
      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          {searchTerm ? (
            <>
              <p className="text-gray-500">No restaurants match "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm text-green hover:underline mt-2"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500">No restaurants found</p>
              <Button onClick={() => handleOpenModal()} variant="outline" className="mt-3">
                Add your first restaurant
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRestaurants.map(restaurant => (
            <MobileRestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}

      {/* Add/Edit Modal - Mobile Friendly */}
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
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                {/* Image Preview */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
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
                <div className="flex-1 w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="block">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      disabled={uploadingImage}
                    >
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
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 text-center sm:text-left">
                    JPG, PNG or GIF. Max 5MB
                  </p>
                </div>
              </div>
              {formData.image_url && !uploadingImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 w-full sm:w-auto"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove Image
                </Button>
              )}
            </div>

            {/* Form Fields - Responsive Grid */}
            <div className="space-y-3">
              <div>
                <Label>Restaurant Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Burger Palace"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your restaurant..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Cuisine Type *</Label>
                <Input
                  value={formData.cuisine_type}
                  onChange={e => setFormData({ ...formData, cuisine_type: e.target.value })}
                  placeholder="e.g., Burgers, Pizza, Sushi"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Restaurant address"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rating (0-5)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: e.target.value })}
                    placeholder="4.5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Delivery Fee (R)</Label>
                  <Input
                    type="number"
                    step="5"
                    min="0"
                    value={formData.delivery_fee}
                    onChange={e => setFormData({ ...formData, delivery_fee: e.target.value })}
                    placeholder="15"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Estimated Delivery Time</Label>
                <Input
                  value={formData.estimated_delivery_time}
                  onChange={e => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
                  placeholder="e.g., 20-30 min"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-green text-white w-full sm:w-auto order-1 sm:order-2">
              {loading ? 'Saving...' : (editingRestaurant ? 'Update' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white w-full sm:w-auto">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}