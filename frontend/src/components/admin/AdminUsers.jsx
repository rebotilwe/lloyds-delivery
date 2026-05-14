import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Key, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  customer: 'bg-blue-100 text-blue-800',
  driver: 'bg-green-100 text-green-800',
};

export default function AdminUsers({ users = [], onRefresh }) {
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [updating, setUpdating] = useState(false);

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

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Users Management</h3>
          <p className="text-sm text-gray-500">{users.length} total users</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role] || roleColors.customer}>
                        {(user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
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
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input 
                type="email"
                value={editForm.email} 
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input 
                value={editForm.phone} 
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Select 
                value={editForm.role} 
                onValueChange={val => setEditForm({ ...editForm, role: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleUpdate} disabled={updating} className="flex-1 bg-navy text-white">
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}