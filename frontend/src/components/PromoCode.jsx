import React, { useState } from 'react';
import { Ticket, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Promo codes database (can be moved to backend)
const PROMO_CODES = {
  'WELCOME20': { discount: 20, type: 'percentage', minOrder: 100, maxDiscount: 100 },
  'SAVE10': { discount: 10, type: 'percentage', minOrder: 50, maxDiscount: 50 },
  'FREEDELIVERY': { discount: 35, type: 'fixed', minOrder: 150, description: 'Free delivery' },
  'FLAT50': { discount: 50, type: 'fixed', minOrder: 200 },
  'FIRSTORDER': { discount: 25, type: 'percentage', minOrder: 80, maxDiscount: 75, firstOrderOnly: true },
};

export default function PromoCode({ subtotal, onApply, onRemove }) {
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [checking, setChecking] = useState(false);

  const calculateDiscount = (codeData, subtotalAmount) => {
    if (subtotalAmount < codeData.minOrder) {
      toast.error(`Minimum order of R${codeData.minOrder} required`);
      return 0;
    }

    let discountAmount = 0;
    if (codeData.type === 'percentage') {
      discountAmount = (subtotalAmount * codeData.discount) / 100;
      if (codeData.maxDiscount && discountAmount > codeData.maxDiscount) {
        discountAmount = codeData.maxDiscount;
      }
    } else {
      discountAmount = codeData.discount;
    }

    return Math.min(discountAmount, subtotalAmount);
  };

  const handleApplyCode = async () => {
    const trimmedCode = code.trim().toUpperCase();
    
    // Check if user has used first order code
    if (PROMO_CODES[trimmedCode]) {
      const codeData = PROMO_CODES[trimmedCode];
      
      // Check for first order only
      if (codeData.firstOrderOnly) {
        const hasOrderedBefore = localStorage.getItem('hasOrderedBefore') === 'true';
        if (hasOrderedBefore) {
          toast.error('This promo code is for first-time customers only');
          return;
        }
      }

      const discountAmount = calculateDiscount(codeData, subtotal);
      
      if (discountAmount > 0) {
        setAppliedCode({ code: trimmedCode, ...codeData });
        setDiscount(discountAmount);
        onApply(discountAmount, codeData.description || `${codeData.discount}${codeData.type === 'percentage' ? '%' : 'R'} off`);
        toast.success(`Promo code applied! You saved R${discountAmount.toFixed(2)}`);
        setCode('');
      }
    } else {
      toast.error('Invalid or expired promo code');
    }
  };

  const handleRemoveCode = () => {
    setAppliedCode(null);
    setDiscount(0);
    onRemove();
    toast.info('Promo code removed');
  };

  return (
    <div className="space-y-3">
      {!appliedCode ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Enter promo code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Button
            onClick={handleApplyCode}
            disabled={!code.trim()}
            variant="outline"
            size="sm"
          >
            Apply
          </Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green" />
            <div>
              <p className="text-sm font-medium text-green">Code: {appliedCode.code}</p>
              <p className="text-xs text-green-600">
                Saved R{discount.toFixed(2)}
              </p>
            </div>
          </div>
          <Button
            onClick={handleRemoveCode}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600"
          >
            Remove
          </Button>
        </div>
      )}

      {/* Available Promos */}
      <div className="mt-2">
        <p className="text-xs text-gray-500 mb-2">Available offers:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROMO_CODES).slice(0, 3).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setCode(key)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full transition"
            >
              {key} - {value.type === 'percentage' ? `${value.discount}% off` : `R${value.discount} off`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}