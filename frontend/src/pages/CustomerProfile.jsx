import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Save, Key, LogOut, Eye, EyeOff, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

export default function CustomerProfile() {
  const { user, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/users/${user.id}`, {
        name: formData.name,
        phone: formData.phone,
        full_name: formData.name,
      });
      
      const updatedUser = { ...user, name: formData.name, full_name: formData.name, phone: formData.phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', {
        user_id: user.id,
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowPassword(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak', color: 'text-red-500' };
    if (password.length < 8) return { strength: 2, label: 'Fair', color: 'text-yellow-500' };
    if (password.match(/[!@#$%^&*(),.?":{}|<>]/)) return { strength: 4, label: 'Strong', color: 'text-green-600' };
    return { strength: 3, label: 'Good', color: 'text-blue-500' };
  };

  const passwordStrength = getPasswordStrength(passwordData.new_password);

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your account settings</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center">
          <User className="w-5 h-5 text-green" />
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Profile Information */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="w-5 h-5 text-green" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 text-sm sm:text-base"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.email}
                  disabled
                  className="pl-10 bg-gray-50 text-sm sm:text-base"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 text-sm sm:text-base"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full bg-green hover:bg-green/90 text-white text-sm sm:text-base h-10 sm:h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="w-5 h-5 text-green" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Enter current password"
                className="text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Enter new password"
                className="text-sm sm:text-base"
              />
              {passwordData.new_password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.strength === 1 ? 'w-1/4 bg-red-500' :
                        passwordStrength.strength === 2 ? 'w-2/4 bg-yellow-500' :
                        passwordStrength.strength === 3 ? 'w-3/4 bg-blue-500' :
                        passwordStrength.strength === 4 ? 'w-full bg-green-500' : 'w-0'
                      }`}
                    />
                  </div>
                  <span className={`text-xs ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                className="text-sm sm:text-base"
              />
              {passwordData.new_password && passwordData.confirm_password && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${passwordData.new_password === passwordData.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordData.new_password === passwordData.confirm_password ? (
                    <><CheckCircle className="w-3 h-3" /> Passwords match</>
                  ) : (
                    <><AlertCircle className="w-3 h-3" /> Passwords do not match</>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPassword ? "Hide Password" : "Show Password"}
              </button>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              variant="outline"
              className="w-full text-sm sm:text-base h-10 sm:h-11"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Security Tip */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-800">Security Tip</p>
              <p className="text-xs text-blue-700">
                Use a strong password with at least 8 characters, including letters, numbers, and special characters.
              </p>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <Card className="overflow-hidden border-red-200">
          <CardHeader className="pb-3 border-b bg-red-50/30">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-red-600">
              <LogOut className="w-5 h-5" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Sign out of your account</p>
            <Button onClick={logout} variant="destructive" className="w-full text-sm sm:text-base h-10 sm:h-11">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}