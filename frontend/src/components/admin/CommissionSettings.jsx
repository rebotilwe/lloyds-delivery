import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, Truck } from 'lucide-react';
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
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-base">Commission & Driver Payment Settings</h3>
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
              Platform earns: R{(100 * commissionRate / 100).toFixed(2)}
            </p>
          </div>

          {/* Driver Payment Information */}
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Driver Payment Structure</span>
            </div>
            <div className="space-y-2 text-xs text-green-700">
              <p className="font-medium">Drivers are paid:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Base Delivery Fee:</strong> R25 - R60 per delivery (based on distance)</li>
                <li><strong>Distance Surcharge:</strong> R5 per km beyond 5km radius</li>
                <li><strong>Wait Time Fee:</strong> R2 per minute after 10 minutes at pickup</li>
                <li><strong>Peak Hour Bonus:</strong> +30% during lunch (12-2pm) and dinner (6-8pm)</li>
                <li><strong>Rainy Day Bonus:</strong> +20% when weather conditions are poor</li>
                <li><strong>Customer Tip:</strong> 100% of tips go directly to the driver</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="font-medium">Example Calculation:</p>
                <p className="text-xs mt-1">
                  Base fee: R30<br />
                  Distance (8km): +R15<br />
                  Peak hour bonus: +R9<br />
                  <strong className="text-green-800">Total driver earns: R54 per delivery</strong>
                </p>
                <p className="text-[11px] text-green-600 mt-2 italic">
                  * Drivers receive their earnings weekly via EFT or instant payout option
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Payment Breakdown for R100 Order</span>
            </div>
            <div className="space-y-1 text-xs text-purple-700">
              <div className="flex justify-between">
                <span>Customer pays:</span>
                <span className="font-medium">R{(100 * (1 + commissionRate / 100) + 35).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-2">
                <span>└─ Food subtotal (+{commissionRate}%):</span>
                <span>R{(100 * (1 + commissionRate / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pl-2">
                <span>└─ Delivery fee:</span>
                <span>R35.00</span>
              </div>
              <div className="border-t border-purple-200 my-1"></div>
              <div className="flex justify-between">
                <span>Restaurant receives:</span>
                <span>R100.00</span>
              </div>
              <div className="flex justify-between">
                <span>Platform earns (commission):</span>
                <span>R{(100 * commissionRate / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Driver earns (delivery fee):</span>
                <span>R35.00</span>
              </div>
              <div className="flex justify-between text-green-700 font-medium">
                <span>Driver total with bonus/tips:</span>
                <span>R35 - R85+ per delivery</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Important</span>
            </div>
            <p className="text-xs text-yellow-700">
              Commission rates are set per restaurant in the Restaurant settings.
              The default rate shown here is for reference only. Driver delivery fees 
              are calculated automatically based on distance and order value.
            </p>
          </div>

          <Button 
            onClick={saveSettings} 
            disabled={saving} 
            className="w-full bg-green-600 text-white hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Update Default Rate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}