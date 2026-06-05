import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

const issueTypes = [
  { value: 'late_delivery', label: '⏰ Late Delivery' },
  { value: 'wrong_item', label: '❌ Wrong Item Received' },
  { value: 'missing_item', label: '📦 Missing Item' },
  { value: 'damaged_item', label: '💔 Damaged Item' },
  { value: 'driver_issue', label: '🚚 Driver Issue' },
  { value: 'payment_issue', label: '💰 Payment Issue' },
  { value: 'other', label: '📝 Other' },
];

export default function ReportIssueModal({ order, isOpen, onClose, onSubmitted }) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      await api.post('/support/tickets', {
        order_id: order.id,
        issue_type: issueType,
        description: description,
      });

      toast.success('Issue reported successfully! We\'ll get back to you soon.');
      onSubmitted();
      onClose();
      setIssueType('');
      setDescription('');
    } catch (error) {
      console.error('Report issue error:', error);
      toast.error(error.response?.data?.message || 'Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Report Issue - Order #{order.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              placeholder="Please describe what went wrong..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include any details that might help us resolve your issue faster.
            </p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-700">
            <p className="font-semibold mb-1">📌 What happens next?</p>
            <p>Our support team will review your issue and respond within 24 hours.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="flex-1 bg-green text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Report
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}