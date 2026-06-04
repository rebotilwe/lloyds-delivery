import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CommissionSettings({ onRefresh }) {
  const [commissionRate, setCommissionRate] = useState(12.5);
  const [saving, setSaving] = useState(false);

  // Commission is set on restaurants individually (10-15% range)
  // This is just an informational component
  const saveSettings = async () => {
    if (commissionRate < 10 || commissionRate > 15) {
      toast.error('Commission rate must be between 10% and 15%');
      return;
    }
    
    setSaving(true);
    try {
      // Note: Commission is actually set per restaurant in the database
      // This is just for demo - you can implement a global setting endpoint later
      toast.success(`Default commission rate set to ${commissionRate}%`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

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
              Default Platform Commission Rate
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-28"
                min="10"
                max="15"
                step="0.5"
              />
              <span className="text-gray-500">% per order</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Restaurants can have individual rates between 10-15%
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">How it works</span>
            </div>
            <p className="text-xs text-blue-700">
              Example: Vendor price R100, {commissionRate}% markup<br />
              Customer pays: R{(100 * (1 + commissionRate / 100)).toFixed(2)}<br />
              Vendor receives: R100<br />
              Platform earns: R{(100 * commissionRate / 100).toFixed(2)}<br />
              Driver earns: Delivery fee + 10% of order total
            </p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Important</span>
            </div>
            <p className="text-xs text-yellow-700">
              Commission rates are set per restaurant in the Restaurant settings.
              The default rate shown here is for reference only.
            </p>
          </div>

          <Button 
            onClick={saveSettings} 
            disabled={saving} 
            className="w-full bg-green text-white"
          >
            {saving ? 'Saving...' : 'Update Default Rate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}