import React from 'react';
import { Clock, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function VendorWaiting() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Account Pending Approval</h1>
        
        <p className="text-gray-600 mb-4">
          Thank you for signing up! Your vendor account is being reviewed by our admin team.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-yellow-800">What happens next?</p>
              <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                <li>• Admin reviews your application (24-48 hours)</li>
                <li>• You'll receive an email when approved</li>
                <li>• Once approved, you can set up your restaurant</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 justify-center">
            <Mail className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700">
              Check your email for approval notification
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate('/')} 
          variant="outline" 
          className="w-full"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
}