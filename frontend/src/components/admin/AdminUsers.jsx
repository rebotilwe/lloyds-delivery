import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { 
  Users, Search, Edit2, Trash2, Save, X, ChevronDown,
  User, Mail, Phone, Shield, Truck, Store, Check,
  AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const ROLES = ['customer', 'driver', 'vendor', 'admin'];

const roleColors = {
  customer: 'bg-blue-100 text-blue-800 border-blue-200',
  driver:   'bg-green-100 text-green-800 border-green-200',
  vendor:   'bg-orange-100 text-orange-800 border-orange-200',
  admin:    'bg-purple-100 text-purple-800 border-purple-200',
};

const roleIcons = {
  customer: User,
  driver:   Truck,
  vendor:   Store,
  admin:    Shield,
};

export default function AdminUsers({ users = [], onRefresh }) {
  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]   = useState('all');
  const [editingId, setEditingId]     = useState(null);
  const [editData, setEditData]       = useState({});
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState(null);

  const filtered = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    return matchRole && matchSearch;
  });

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({ name: user.name || '', email: user.email || '', phone: user.phone || '', role: user.role || 'customer' });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (userId) => {
    setSaving(true);
    try {
      await api.put(`/users/${userId}`, editData);
      toast.success('User updated successfully');
      setEditingId(null);
      setEditData({});
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Users ({users.length})</h2>
          <p className="text-sm text-gray-500">Manage platform users and their roles</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm" className="rounded-xl">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="pl-9 rounded-xl"
          />
        </div>
        {/* FIX #2: Role filter uses styled buttons instead of a <select> dropdown
            to avoid the z-index overlap with table rows and Save/Cancel buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', ...ROLES].map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                filterRole === role
                  ? 'bg-green text-white border-green'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROLES.map(role => {
          const Icon = roleIcons[role];
          const count = users.filter(u => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                filterRole === role ? 'border-green bg-green/5' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${roleColors[role]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 capitalize">{role}s</p>
                <p className="text-sm font-bold text-gray-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Users list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const isEditing = editingId === user.id;
            const RoleIcon = roleIcons[user.role] || User;

            return (
              <Card key={user.id} className="rounded-2xl border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  {isEditing ? (
                    /* ── Edit Mode ── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Name</label>
                          <Input
                            value={editData.name}
                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                            className="rounded-lg text-sm"
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Email</label>
                          <Input
                            value={editData.email}
                            onChange={e => setEditData({ ...editData, email: e.target.value })}
                            className="rounded-lg text-sm"
                            type="email"
                            placeholder="Email address"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                          <Input
                            value={editData.phone}
                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                            className="rounded-lg text-sm"
                            placeholder="Phone number"
                          />
                        </div>
                        {/* FIX #2: Role selector uses pill buttons, not a <select> dropdown
                            so there's no dropdown overlap with other UI elements */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Role</label>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLES.map(role => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setEditData({ ...editData, role })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                  editData.role === role
                                    ? roleColors[role] + ' border-transparent'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {editData.role === role && <Check className="w-3 h-3 inline mr-1" />}
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => saveEdit(user.id)}
                          disabled={saving}
                          className="bg-green text-white rounded-xl text-sm"
                          size="sm"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Save Changes
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm" className="rounded-xl text-sm">
                          <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── View Mode ── */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900 truncate">{user.name || 'No name'}</p>
                            <Badge className={`border text-[10px] font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                              {user.role}
                            </Badge>
                            {user.driver_status === 'approved' && (
                              <Badge className="border text-[10px] bg-green-100 text-green-700 border-green-200">✓ Approved</Badge>
                            )}
                            {user.driver_status === 'pending' && (
                              <Badge className="border text-[10px] bg-yellow-100 text-yellow-700 border-yellow-200">⏳ Pending</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => startEdit(user)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => deleteUser(user.id, user.name)}
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === user.id}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          {deletingId === user.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}