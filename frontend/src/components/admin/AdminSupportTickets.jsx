import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MessageCircle,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const issueTypeLabels = {
  late_delivery: '⏰ Late Delivery',
  wrong_item: '❌ Wrong Item',
  missing_item: '📦 Missing Item',
  damaged_item: '💔 Damaged Item',
  driver_issue: '🚚 Driver Issue',
  payment_issue: '💰 Payment Issue',
  other: '📝 Other',
};

// Helper to safely format currency
const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '0.00';
};

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/support/admin/tickets?status=${statusFilter}`);
      setTickets(response.data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async () => {
    if (!selectedTicket) return;
    
    setUpdating(true);
    try {
      await api.put(`/support/admin/tickets/${selectedTicket.id}`, {
        status: newStatus || selectedTicket.status,
        admin_response: adminResponse,
      });
      
      toast.success('Ticket updated successfully');
      fetchTickets();
      setSelectedTicket(null);
      setAdminResponse('');
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const openTicketModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setAdminResponse(ticket.admin_response || '');
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold">Support Tickets</h2>
          <p className="text-sm text-gray-500">Manage customer complaints and issues</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchTickets} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            <p className="text-xs text-gray-500">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.in_progress}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-gray-500">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p>No support tickets found</p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition cursor-pointer" onClick={() => openTicketModal(ticket)}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">#{ticket.id}</p>
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status?.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issueTypeLabels[ticket.issue_type] || ticket.issue_type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{ticket.customer_name}</p>
                    <p className="text-xs text-gray-500">Order #{ticket.order_id} • {ticket.restaurant_name}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ticket.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Respond
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket #{selectedTicket?.id}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Details
                </p>
                <p className="text-sm">{selectedTicket.customer_name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {selectedTicket.customer_email}
                </p>
                {selectedTicket.customer_phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedTicket.customer_phone}
                  </p>
                )}
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Order Details
                </p>
                <p className="text-sm">Order #{selectedTicket.order_id}</p>
                <p className="text-xs text-gray-500">{selectedTicket.restaurant_name}</p>
                <p className="text-xs text-gray-500">
                  Total: R{formatCurrency(selectedTicket.order_total)}
                </p>
              </div>

              {/* Issue Details */}
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Issue Reported
                </p>
                <p className="text-sm mt-1">{issueTypeLabels[selectedTicket.issue_type]}</p>
                <p className="text-xs text-gray-600 mt-1">{selectedTicket.description}</p>
              </div>

              {/* Admin Response */}
              <div>
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Response to Customer</Label>
                <Textarea
                  placeholder="Type your response here..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={updateTicket} 
                  disabled={updating}
                  className="flex-1 bg-green text-white"
                >
                  {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update & Notify Customer
                </Button>
                <Button onClick={() => setSelectedTicket(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}