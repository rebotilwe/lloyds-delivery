import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Save, LogOut, User, Mail, Phone, Key, Shield, AlertCircle } from 'lucide-react';

export default function AdminSettings() {
  const { user, logout, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
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
        full_name: user.full_name || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/users/${user.id}`, {
        full_name: formData.full_name,
        phone: formData.phone,
      });
      const updatedUser = { ...user, ...response.data, full_name: formData.full_name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.current_password) {
      toast.error('Please enter your current password');
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (formData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
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
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Profile Settings
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your full name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-gray-50 pl-9"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Your phone number"
                className="pl-9"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateProfile} 
            disabled={loading} 
            className="w-full sm:w-auto bg-navy hover:bg-navy/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-orange-500" />
          Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={formData.current_password}
              onChange={e => setFormData({ ...formData, current_password: e.target.value })}
              placeholder="Enter current password"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={formData.new_password}
              onChange={e => setFormData({ ...formData, new_password: e.target.value })}
              placeholder="Enter new password"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
              placeholder="Confirm new password"
              className="mt-1"
            />
            {formData.new_password && formData.confirm_password && formData.new_password !== formData.confirm_password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
          </div>
          <Button 
            onClick={handleChangePassword} 
            disabled={passwordLoading} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Key className="w-4 h-4 mr-2" />
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>

      {/* Session Management - Logout */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <LogOut className="w-5 h-5" />
          Session Management
        </h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your admin account</p>
        
        {/* Security Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800">Security Tip</p>
              <p className="text-xs text-amber-700">Always log out after completing your admin tasks, especially on shared devices.</p>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={logout} 
          variant="destructive"
          className="w-full sm:w-auto"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}