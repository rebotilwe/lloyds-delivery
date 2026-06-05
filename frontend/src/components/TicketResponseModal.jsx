import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle, Clock } from 'lucide-react';
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

export default function TicketResponseModal({ isOpen, onClose, ticket }) {
  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Support Ticket #{ticket.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status:</span>
            <Badge className={statusColors[ticket.status]}>
              {ticket.status?.toUpperCase()}
            </Badge>
          </div>

          {/* Issue Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Issue Type:</span>
            <span className="text-sm">{issueTypeLabels[ticket.issue_type] || ticket.issue_type}</span>
          </div>

          {/* Your Description */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Your Description:</p>
            <p className="text-sm">{ticket.description}</p>
            <p className="text-[10px] text-gray-400 mt-2">
              Submitted: {format(new Date(ticket.created_at), 'dd MMM yyyy, h:mm a')}
            </p>
          </div>

          {/* Admin Response */}
          <div className={`p-3 rounded-lg ${ticket.admin_response ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
              {ticket.admin_response ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <Clock className="w-3 h-3 text-yellow-600" />
              )}
              {ticket.admin_response ? 'Admin Response:' : 'Awaiting Response...'}
            </p>
            {ticket.admin_response ? (
              <>
                <p className="text-sm">{ticket.admin_response}</p>
                {ticket.resolved_at && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Resolved: {format(new Date(ticket.resolved_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-yellow-700">
                Our support team is reviewing your issue. You'll receive a response within 24 hours.
              </p>
            )}
          </div>

          <Button onClick={onClose} className="w-full bg-green text-white">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}