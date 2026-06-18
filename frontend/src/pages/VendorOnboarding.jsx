import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Store, MapPin, Phone, DollarSign, Loader2, 
  Upload, FileCheck, AlertCircle, X, FileText,
  CheckCircle, Building, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function VendorOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [checkingRestaurant, setCheckingRestaurant] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    phone: '',
    delivery_fee: 20,
    business_registration_number: '',
    tax_clearance_number: '',
  });

  const [documents, setDocuments] = useState({
    business_license: null,
    health_certificate: null,
    halaal_certificate: null,
    bank_confirmation: null,
  });

  const [previews, setPreviews] = useState({
    business_license: null,
    health_certificate: null,
    halaal_certificate: null,
    bank_confirmation: null,
  });

  // Load user data and check for existing restaurant
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      
      // Check if they already have a restaurant
      const checkRestaurant = async () => {
        try {
          const response = await api.get('/vendor/restaurant');
          if (response.data && response.data.id) {
            setHasRestaurant(true);
            // If they have a restaurant and status is pending, redirect to waiting
            if (parsed.vendor_status === 'pending') {
              navigate('/vendor-waiting');
              return;
            }
          }
        } catch (err) {
          // No restaurant found - that's fine, they need to onboard
          setHasRestaurant(false);
        } finally {
          setCheckingRestaurant(false);
        }
      };
      
      // If vendor is pending, check if they have a restaurant
      if (parsed.vendor_status === 'pending') {
        checkRestaurant();
      } else {
        setCheckingRestaurant(false);
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (JPG, PNG) and PDF files are allowed');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews(prev => ({ ...prev, [field]: file.name }));
    }

    setDocuments(prev => ({ ...prev, [field]: file }));
    toast.success(`${file.name} uploaded successfully`);
  };

  const removeFile = (field) => {
    setDocuments(prev => ({ ...prev, [field]: null }));
    setPreviews(prev => ({ ...prev, [field]: null }));
    toast.info('File removed');
  };

  const FileUploadArea = ({ field, label, required, preview, description }) => (
    <div className="border rounded-lg p-3 sm:p-4">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      {preview ? (
        <div className="relative">
          {typeof preview === 'string' && preview.startsWith('data:image') ? (
            <img src={preview} alt={label} className="w-full h-32 sm:h-40 object-cover rounded-lg" />
          ) : preview && typeof preview === 'string' ? (
            <div className="w-full h-24 sm:h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
              <p className="text-xs text-gray-500 mt-1 truncate max-w-[90%]">{preview}</p>
            </div>
          ) : null}
          <button
            onClick={() => removeFile(field)}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <div className="flex flex-col items-center justify-center pt-4 pb-4">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-1" />
            <p className="text-xs sm:text-sm text-gray-500 text-center px-2">Click to upload {label}</p>
            <p className="text-[10px] sm:text-xs text-gray-400">JPG, PNG, PDF (max 5MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={(e) => handleFileChange(e, field)}
          />
        </label>
      )}
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address) {
      toast.error('Please fill in restaurant name and address');
      return;
    }

    // Check if required documents are uploaded
    if (!documents.business_license) {
      toast.error('Please upload your business license');
      return;
    }
    if (!documents.health_certificate) {
      toast.error('Please upload your health certificate');
      return;
    }

    setLoading(true);
    try {
      // First, create the restaurant
      const restaurantResponse = await api.post('/vendor/setup-restaurant', {
        name: formData.name,
        description: formData.description,
        cuisine_type: formData.cuisine_type,
        address: formData.address,
        phone: formData.phone,
        delivery_fee: Number(formData.delivery_fee),
        business_registration_number: formData.business_registration_number,
        tax_clearance_number: formData.tax_clearance_number,
      });

      if (!restaurantResponse.data.success) {
        throw new Error('Failed to create restaurant');
      }

      const restaurantId = restaurantResponse.data.restaurant_id;

      // Upload documents
      const uploadPromises = [];
      
      for (const [docType, file] of Object.entries(documents)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('document_key', docType);
          
       // Change it to:
uploadPromises.push(
  api.post(`/vendor/upload-document`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
);
        }
      }

      await Promise.all(uploadPromises);

      // Update vendor status to pending approval
      await api.put('/vendor/update-status', { 
        vendor_status: 'pending'
      });

      toast.success('Restaurant created and documents submitted for review!');
      setSubmitted(true);
      
      // Update user in localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        userData.vendor_status = 'pending';
        localStorage.setItem('user', JSON.stringify(userData));
      }

      navigate('/vendor-waiting');

    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error.response?.data?.message || 'Failed to setup restaurant');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking for restaurant
  if (checkingRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // If they already have a restaurant and are pending, show waiting
  if (hasRestaurant && user?.vendor_status === 'pending') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-500" />
            <h2 className="text-xl sm:text-2xl font-bold">Application Under Review</h2>
            <p className="text-sm text-gray-500">
              Your restaurant application and documents have been submitted and are being reviewed by the admin team.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              You will receive a notification once your application is approved. This usually takes 24-48 hours.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-green text-white px-6 py-2 rounded-lg"
            >
              Return to Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If vendor is rejected
  if (user?.vendor_status === 'rejected') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500" />
            <h2 className="text-xl sm:text-2xl font-bold">Application Rejected</h2>
            <p className="text-sm text-gray-500">
              Your restaurant application was not approved. Please contact support for more information.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg"
            >
              Contact Support
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the onboarding form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-8 h-8 text-green" />
          </div>
          <h1 className="text-2xl font-bold">Welcome! Let's set up your restaurant</h1>
          <p className="text-gray-500 text-sm mt-1">Tell us about your business and upload required documents</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Restaurant Name */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4" />
                  Restaurant Name *
                </Label>
                <Input
                  name="name"
                  placeholder="e.g., Kota King, Burger Palace"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  name="description"
                  placeholder="Tell customers about your restaurant..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {/* Cuisine Type */}
              <div>
                <Label>Cuisine Type</Label>
                <Input
                  name="cuisine_type"
                  placeholder="e.g., Fast Food, Pizza, Sushi, Burgers"
                  value={formData.cuisine_type}
                  onChange={handleChange}
                />
              </div>

              {/* Address */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" />
                  Restaurant Address *
                </Label>
                <Input
                  name="address"
                  placeholder="Full street address, city, postal code"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4" />
                  Contact Phone
                </Label>
                <Input
                  name="phone"
                  placeholder="+27 XX XXX XXXX"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {/* Delivery Fee */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Delivery Fee (R)
                </Label>
                <Input
                  type="number"
                  name="delivery_fee"
                  value={formData.delivery_fee}
                  onChange={handleChange}
                  min="0"
                  step="5"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This fee goes to the driver. You can change this later.
                </p>
              </div>

              {/* Business Registration */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Building className="w-4 h-4" />
                  Business Registration Number
                </Label>
                <Input
                  name="business_registration_number"
                  placeholder="e.g., 2020/123456/07"
                  value={formData.business_registration_number}
                  onChange={handleChange}
                />
              </div>

              {/* Tax Clearance */}
              <div>
                <Label>Tax Clearance Number</Label>
                <Input
                  name="tax_clearance_number"
                  placeholder="e.g., TC-123456"
                  value={formData.tax_clearance_number}
                  onChange={handleChange}
                />
              </div>

              {/* Documents Upload Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green" />
                  Required Documents
                </h3>
                
                <FileUploadArea 
                  field="business_license" 
                  label="Business License / Registration" 
                  required 
                  preview={previews.business_license}
                  description="Official business registration or license document"
                />
                
                <FileUploadArea 
                  field="health_certificate" 
                  label="Health Certificate" 
                  required 
                  preview={previews.health_certificate}
                  description="Food safety or health department certificate"
                />
                
                <FileUploadArea 
                  field="halaal_certificate" 
                  label="Halaal Certificate (Optional)" 
                  required={false}
                  preview={previews.halaal_certificate}
                  description="If applicable, upload your Halaal certification"
                />
                
                <FileUploadArea 
                  field="bank_confirmation" 
                  label="Bank Confirmation Letter (Optional)" 
                  required={false}
                  preview={previews.bank_confirmation}
                  description="Bank confirmation for payouts"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  💡 After setup, your application will be reviewed by our team. 
                  You'll receive a notification once approved. This usually takes 24-48 hours.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green text-white h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>

              <p className="text-xs text-center text-gray-400">
                By submitting, you agree to our vendor terms and conditions
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}