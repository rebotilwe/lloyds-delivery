import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Save, LogOut, User, Mail, Phone, Key } from 'lucide-react';

export default function AdminSettings() {
  const { user, logout, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await api.put(`/users/${user.id}`, {
        full_name: formData.full_name,
        phone: formData.phone,
      });
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (formData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        user_id: user.id,
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      toast.success('Password changed successfully');
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Settings
        </h2>
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your full name"
            />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              value={formData.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Your phone number"
            />
          </div>
          <Button onClick={handleUpdateProfile} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={formData.current_password}
              onChange={e => setFormData({ ...formData, current_password: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={formData.new_password}
              onChange={e => setFormData({ ...formData, new_password: e.target.value })}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={formData.confirm_password}
              onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={loading} variant="outline">
            <Key className="w-4 h-4 mr-2" />
            Update Password
          </Button>
        </div>
      </div>

      {/* Logout Section */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <LogOut className="w-5 h-5" />
          Session Management
        </h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your admin account</p>
        <Button onClick={logout} variant="destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}