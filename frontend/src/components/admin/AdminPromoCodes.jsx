import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, expires_at: '' });

  const addPromoCode = async () => {
    try {
      await api.post('/admin/promocodes', newCode);
      toast.success('Promo code created');
      setShowAdd(false);
      fetchPromoCodes();
    } catch (error) {
      toast.error('Failed to create promo code');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold">Promo Codes</h2>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-green text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Code
        </Button>
      </div>
      {/* List of promo codes */}
      <div className="space-y-2">
        {/* Render promo codes here */}
      </div>
    </div>
  );
}