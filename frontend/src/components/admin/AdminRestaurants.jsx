import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const cuisines = ['Fast Food', 'Pizza', 'Burgers', 'Sushi', 'Chinese', 'Indian', 'Mexican', 'Italian', 'Healthy', 'Desserts', 'Drinks', 'Other'];

const emptyForm = { name: '', description: '', cuisine_type: 'Fast Food', address: '', delivery_fee: 0, estimated_delivery_time: '25-35 min', rating: 4.5, image_url: '', is_active: true };

export default function AdminRestaurants({ restaurants, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    if (editId) {
      await base44.entities.Restaurant.update(editId, form);
      toast.success('Restaurant updated');
    } else {
      await base44.entities.Restaurant.create(form);
      toast.success('Restaurant created');
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    onRefresh();
  };

  const handleEdit = (r) => {
    setForm({ name: r.name, description: r.description || '', cuisine_type: r.cuisine_type || 'Other', address: r.address || '', delivery_fee: r.delivery_fee || 0, estimated_delivery_time: r.estimated_delivery_time || '', rating: r.rating || 0, image_url: r.image_url || '', is_active: r.is_active !== false });
    setEditId(r.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Restaurant.delete(id);
    toast.success('Restaurant deleted');
    onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold text-lg">Restaurants</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Restaurant' : 'New Restaurant'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Select value={form.cuisine_type} onValueChange={v => setForm({ ...form, cuisine_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cuisines.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Delivery fee (R)" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: parseFloat(e.target.value) || 0 })} />
                <Input placeholder="Delivery time" value={form.estimated_delivery_time} onChange={e => setForm({ ...form, estimated_delivery_time: e.target.value })} />
              </div>
              <Input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
              <Button onClick={handleSave} className="w-full bg-primary">{editId ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cuisine</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.cuisine_type || '-'}</TableCell>
                <TableCell>{r.rating?.toFixed(1) || '-'}</TableCell>
                <TableCell>
                  <Badge variant={r.is_active !== false ? 'default' : 'secondary'} className={r.is_active !== false ? 'bg-green-100 text-green-800' : ''}>
                    {r.is_active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}