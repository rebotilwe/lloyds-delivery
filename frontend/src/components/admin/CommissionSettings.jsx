import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CommissionSettings({ onRefresh }) {
  const [commissionRate, setCommissionRate] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/settings');
      if (response.data?.commission_rate) {
        setCommissionRate(response.data.commission_rate);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Default values if endpoint doesn't exist yet
      setCommissionRate(10);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { commission_rate: commissionRate });
      toast.success(`Commission rate updated to ${commissionRate}%`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-green" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green" />
          <h3 className="font-semibold text-base">Commission Settings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Platform Commission Rate
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-28"
                min="0"
                max="100"
                step="0.5"
              />
              <span className="text-gray-500">% per order</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Drivers earn: Delivery Fee + ({commissionRate}% of order subtotal)
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">How it works</span>
            </div>
            <p className="text-xs text-blue-700">
              Example: Order total R100, Delivery fee R20<br />
              Platform earns: R100 × {commissionRate}% = R{(100 * commissionRate / 100).toFixed(2)}<br />
              Driver earns: R20 + R{(100 * commissionRate / 100).toFixed(2)} = R{(20 + (100 * commissionRate / 100)).toFixed(2)}
            </p>
          </div>

          <Button 
            onClick={saveSettings} 
            disabled={saving} 
            className="w-full bg-green text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Commission Rate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}