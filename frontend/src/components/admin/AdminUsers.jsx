import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Key, Loader2, Search, X, User, Mail, Phone, Shield, Truck, Calendar } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  customer: 'bg-blue-100 text-blue-800',
  driver: 'bg-green-100 text-green-800',
};

const roleIcons = {
  admin: <Shield className="w-3 h-3" />,
  customer: <User className="w-3 h-3" />,
  driver: <Truck className="w-3 h-3" />,
};

export default function AdminUsers({ users = [], onRefresh }) {
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [mobileView, setMobileView] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm);
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
    });
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await api.put(`/users/${editingUser.id}`, editForm);
      toast.success('User updated successfully');
      setEditingUser(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) return;
    
    setDeletingId(user.id);
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted successfully');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = prompt(`Enter new password for ${user.name}:`, '123456');
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    
    setResettingId(user.id);
    try {
      await api.post(`/users/${user.id}/reset-password`, { password: newPassword });
      toast.success(`Password reset to: ${newPassword}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to reset password');
    } finally {
      setResettingId(null);
    }
  };

  // Mobile User Card Component
  const MobileUserCard = ({ user }) => (
    <div className="bg-white border rounded-xl p-4 mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-sm">{user.name || '-'}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <Badge className={roleColors[user.role] || roleColors.customer}>
          {(user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1)}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        {user.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Mail className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600">{user.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            Joined {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
          </span>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="mt-3">
        {user.driver_status === 'pending' && (
          <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
        )}
        {user.driver_status === 'approved' && (
          <Badge className="bg-green-100 text-green-800">Approved Driver</Badge>
        )}
        {user.driver_status === 'rejected' && (
          <Badge className="bg-red-100 text-red-800">Rejected</Badge>
        )}
        {!user.driver_status && user.role !== 'driver' && (
          <Badge className="bg-green-100 text-green-800">Active</Badge>
        )}
        {user.role === 'driver' && !user.driver_status && (
          <Badge className="bg-gray-100 text-gray-800">Not Submitted</Badge>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs"
          onClick={() => handleEdit(user)}
        >
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
          onClick={() => handleDelete(user)}
          disabled={deletingId === user.id}
        >
          {deletingId === user.id ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Trash2 className="w-3 h-3 mr-1" />
          )}
          Delete
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs"
          onClick={() => handleResetPassword(user)}
          disabled={resettingId === user.id}
        >
          {resettingId === user.id ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Key className="w-3 h-3 mr-1" />
          )}
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header - Mobile Friendly */}
        <div className="p-3 sm:p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-base sm:text-lg">Users Management</h3>
              <p className="text-xs text-gray-500">{filteredUsers.length} of {users.length} total users</p>
            </div>
            
            {/* Search and Filter - Mobile Friendly */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm w-full sm:w-48"
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
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-full sm:w-32 text-sm">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        {mobileView ? (
          <div className="p-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No users found</p>
                {(searchTerm || roleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                    }}
                    className="text-sm text-green hover:underline mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredUsers.map(user => (
                <MobileUserCard key={user.id} user={user} />
              ))
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Email</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Role</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap hidden md:table-cell">Phone</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="font-semibold text-slate-600 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      {searchTerm || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-sm whitespace-nowrap">{user.name || '-'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={roleColors[user.role] || roleColors.customer}>
                          {(user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{user.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                        {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {user.driver_status === 'pending' && (
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                        )}
                        {user.driver_status === 'approved' && (
                          <Badge className="bg-green-100 text-green-800">Approved</Badge>
                        )}
                        {user.driver_status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                        )}
                        {!user.driver_status && user.role !== 'driver' && (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        )}
                        {user.role === 'driver' && !user.driver_status && (
                          <Badge className="bg-gray-100 text-gray-800">Not Submitted</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(user)}
                            title="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            title="Delete User"
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleResetPassword(user)}
                            disabled={resettingId === user.id}
                            title="Reset Password"
                          >
                            {resettingId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Key className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit User Dialog - Mobile Friendly */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input 
                type="email"
                value={editForm.email} 
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input 
                value={editForm.phone} 
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Select 
                value={editForm.role} 
                onValueChange={val => setEditForm({ ...editForm, role: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleUpdate} disabled={updating} className="flex-1 bg-navy text-white order-2 sm:order-1">
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1 order-1 sm:order-2">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}