import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const categories = ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks', 'Combos', 'Specials'];

const emptyForm = { name: '', description: '', price: 0, category: 'Mains', restaurant_id: '', image_url: '', is_available: true };

export default function AdminMenuItems({ restaurants }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const queryClient = useQueryClient();

  const { data: menuItems = [] } = useQuery({
    queryKey: ['adminMenuItems'],
    queryFn: () => base44.entities.MenuItem.list('-created_date', 200),
  });

  const filtered = selectedRestaurant === 'all' ? menuItems : menuItems.filter(m => m.restaurant_id === selectedRestaurant);

  const getRestName = (id) => restaurants.find(r => r.id === id)?.name || '-';

  const handleSave = async () => {
    if (!form.name || !form.restaurant_id) { toast.error('Name and restaurant required'); return; }
    if (editId) {
      await base44.entities.MenuItem.update(editId, form);
      toast.success('Menu item updated');
    } else {
      await base44.entities.MenuItem.create(form);
      toast.success('Menu item created');
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
  };

  const handleDelete = async (id) => {
    await base44.entities.MenuItem.delete(id);
    toast.success('Item deleted');
    queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold text-lg">Menu Items</h3>
        <div className="flex items-center gap-3">
          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by restaurant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Edit Item' : 'New Menu Item'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <Input type="number" placeholder="Price (R)" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                <Select value={form.restaurant_id || ''} onValueChange={v => setForm({ ...form, restaurant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select restaurant *" /></SelectTrigger>
                  <SelectContent>{restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                <Button onClick={handleSave} className="w-full bg-primary">{editId ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No menu items</TableCell></TableRow>
            ) : filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-sm">{getRestName(item.restaurant_id)}</TableCell>
                <TableCell className="text-sm">{item.category || '-'}</TableCell>
                <TableCell className="font-semibold">R{item.price?.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm(item); setEditId(item.id); setOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
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