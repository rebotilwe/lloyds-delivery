// src/pages/admin/AdminSettingsPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', phone: '',
    current_password: '', new_password: '', confirm_password: '',
  });

  useEffect(() => {
    if (user) setForm(f => ({ ...f, full_name: user.full_name || user.name || '', phone: user.phone || '' }));
  }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, { full_name: form.full_name, phone: form.phone });
      const updated = { ...user, full_name: form.full_name, phone: form.phone };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (form.new_password !== form.confirm_password) return toast.error('Passwords do not match');
    if (form.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        user_id: user.id,
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success('Password changed');
      setForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
    } catch { toast.error('Failed to change password'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="text-base font-bold">Settings</h2>
        <p className="text-xs text-slate-400">Manage your admin profile</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold">Profile</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Full name</label>
          <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Email</label>
          <Input value={user?.email} disabled className="h-10 bg-slate-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Phone</label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="h-10" />
        </div>
        <Button onClick={saveProfile} disabled={loading} className="h-10 w-full bg-slate-900 text-white hover:bg-slate-800">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>

      {/* Password */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold">Change Password</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Current password</label>
          <Input type="password" value={form.current_password} onChange={e => set('current_password', e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">New password</label>
          <Input type="password" value={form.new_password} onChange={e => set('new_password', e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Confirm new password</label>
          <Input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} className="h-10" />
        </div>
        <Button onClick={changePassword} disabled={loading} variant="outline" className="h-10 w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </div>
    </div>
  );
}