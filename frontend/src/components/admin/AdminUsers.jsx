import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  customer: 'bg-blue-100 text-blue-800',
  driver: 'bg-green-100 text-green-800',
};

export default function AdminUsers({ users }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg">Users</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users</TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge className={roleColors[u.role] || roleColors.customer}>
                    {(u.role || 'customer').charAt(0).toUpperCase() + (u.role || 'customer').slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.created_date ? format(new Date(u.created_date), 'dd MMM yyyy') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}