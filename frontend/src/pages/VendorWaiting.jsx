import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { toast } from 'sonner';

export default function VendorWaiting() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    setLoading(false);
  }, []);

  // If user is approved, redirect to vendor dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.vendor_status === 'approved') {
        navigate('/vendor');
      }
    }
  }, [user, loading, navigate]);

  // Refresh user status periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get('/vendor/status');
        if (response.data && response.data.vendor_status) {
          const updatedUser = { ...user, vendor_status: response.data.vendor_status };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);

          if (response.data.vendor_status === 'approved') {
            toast.success('Your vendor account has been approved!');
            navigate('/vendor');
          }
        }
      } catch (err) {
        // Silent fail - don't spam errors
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, navigate]);

  const checkStatusManually = async () => {
    setCheckingStatus(true);
    try {
      const response = await api.get('/vendor/status');
      if (response.data && response.data.vendor_status) {
        const updatedUser = { ...user, vendor_status: response.data.vendor_status };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        if (response.data.vendor_status === 'approved') {
          toast.success('Your vendor account has been approved!');
          navigate('/vendor');
        } else {
          toast.info(`Status: ${response.data.vendor_status.toUpperCase()}`);
        }
      }
    } catch (err) {
      toast.error('Failed to check status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // If user is rejected
  if (user?.vendor_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-red-600 mb-2">Application Rejected</h1>
          
          <p className="text-gray-600 mb-4">
            We regret to inform you that your vendor application has been reviewed and was not approved at this time.
          </p>
          
          {user.vendor_rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-700">{user.vendor_rejection_reason}</p>
            </div>
          )}
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-medium text-blue-800">What you can do:</p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1">
              <li>• Contact support for more details</li>
              <li>• Review the requirements and re-apply</li>
              <li>• Ensure all documents are complete and valid</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/contact')} 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Contact Support
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: Pending approval
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
                <li>• You'll receive a notification when approved</li>
                <li>• Once approved, you can manage your restaurant</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 justify-center">
            <Mail className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700">
              Check your email for approval notification
            </p>
          </div>
          <p className="text-[10px] text-blue-500 mt-2">
            We'll also notify you in the app when your account is approved
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Submitted documents:</span>
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">✅ Business License</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">✅ Health Certificate</span>
            <span className={`text-xs px-2 py-0.5 rounded ${user?.halaal_certificate ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {user?.halaal_certificate ? '✅' : '⬜'} Halaal Certificate
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${user?.bank_confirmation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {user?.bank_confirmation ? '✅' : '⬜'} Bank Confirmation
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={checkStatusManually} 
            disabled={checkingStatus}
            variant="outline" 
            className="w-full"
          >
            {checkingStatus ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Status Now'
            )}
          </Button>
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            className="w-full"
          >
            Return to Home
          </Button>
        </div>

        <p className="text-[10px] text-gray-400 mt-4">
          Status automatically refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}