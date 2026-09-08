import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { 
  Store, MapPin, Phone, DollarSign, Loader2, 
  Upload, AlertCircle, X, FileText,
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
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    phone: '',
    delivery_fee: 20,
    business_registration_number: '',
    tax_clearance_number: '',
    latitude: null,
    longitude: null,
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

  // ── Validation Functions ──
  const validatePhone = (phone) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) return true;
    if (digits.length === 11 && digits.startsWith('27')) return true;
    if (digits.length === 9) return true;
    return false;
  };

  const validateBRN = (brn) => {
    if (!brn) return true;
    const brnRegex = /^\d{4}\/\d{6}\/\d{2}$/;
    return brnRegex.test(brn);
  };

  const validateDeliveryFee = (fee) => {
    const num = parseFloat(fee);
    return !isNaN(num) && num >= 0 && num <= 1000;
  };

  // ── Pre-fill restaurant details ──
  useEffect(() => {
    const pending = localStorage.getItem('pending_vendor_restaurant');
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        setFormData(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          address: parsed.address || prev.address,
          phone: parsed.phone || prev.phone,
          business_registration_number: parsed.business_registration_number || prev.business_registration_number,
        }));
      } catch (err) {} finally {
        localStorage.removeItem('pending_vendor_restaurant');
      }
    }
  }, []);

  // ── Load user data ──
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      const hasBusinessLicense = !!(parsed.business_license && parsed.business_license.trim() !== '');
      const hasHealthCert = !!(parsed.health_certificate && parsed.health_certificate.trim() !== '');
      const hasHalaalCert = !!(parsed.halaal_certificate && parsed.halaal_certificate.trim() !== '');
      const hasBankConf = !!(parsed.bank_confirmation && parsed.bank_confirmation.trim() !== '');
      const hasDocs = hasBusinessLicense || hasHealthCert || hasHalaalCert || hasBankConf;
      
      const checkRestaurant = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await api.get('/vendor/restaurant', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.data && response.data.id) {
            setHasRestaurant(true);
            if (parsed.vendor_status === 'pending' && hasDocs) {
              navigate('/vendor-waiting');
              return;
            }
          }
        } catch (err) {
          setHasRestaurant(false);
        } finally {
          setCheckingRestaurant(false);
        }
      };
      
      if (parsed.vendor_status === 'pending') {
        checkRestaurant();
      } else {
        setCheckingRestaurant(false);
      }
    } else {
      setCheckingRestaurant(false);
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Cuisine type: only letters, spaces, and basic punctuation
    if (name === 'cuisine_type') {
      const cleaned = value.replace(/[^a-zA-Z\s\-',&]/g, '');
      setFormData({ ...formData, cuisine_type: cleaned });
      if (errors.cuisine_type) setErrors(prev => ({ ...prev, cuisine_type: '' }));
      return;
    }
    
    // Phone validation
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      setFormData({ ...formData, phone: digits });
      if (digits && !validatePhone(digits)) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid South African phone number' }));
      } else {
        setErrors(prev => ({ ...prev, phone: '' }));
      }
      return;
    }
    
    // Delivery fee validation
    if (name === 'delivery_fee') {
      const num = parseFloat(value);
      if (value && (isNaN(num) || num < 0 || num > 1000)) {
        setErrors(prev => ({ ...prev, delivery_fee: 'Please enter a valid amount between 0 and 1000' }));
      } else {
        setErrors(prev => ({ ...prev, delivery_fee: '' }));
      }
    }
    
    // BRN validation
    if (name === 'business_registration_number') {
      setFormData({ ...formData, [name]: value });
      if (value && !validateBRN(value)) {
        setErrors(prev => ({ ...prev, business_registration_number: 'Format: YYYY/XXXXXX/XX' }));
      } else {
        setErrors(prev => ({ ...prev, business_registration_number: '' }));
      }
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleAddressSelect = (fullAddress, coords) => {
    setFormData({ 
      ...formData, 
      address: fullAddress,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null
    });
    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
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

  const uploadDocument = async (documentKey, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_key', documentKey);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://lloyds-delivery.onrender.com/api/vendor/upload-document', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to upload ${documentKey}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error uploading ${documentKey}:`, error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // ── Validate all fields ──
    if (!formData.name.trim()) newErrors.name = 'Restaurant name is required';
    if (!formData.address.trim()) newErrors.address = 'Restaurant address is required';
    
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid South African phone number';
    }
    
    if (formData.delivery_fee && !validateDeliveryFee(formData.delivery_fee)) {
      newErrors.delivery_fee = 'Please enter a valid amount between 0 and 1000';
    }
    
    if (formData.business_registration_number && !validateBRN(formData.business_registration_number)) {
      newErrors.business_registration_number = 'Format: YYYY/XXXXXX/XX';
    }

    if (formData.cuisine_type && !/^[a-zA-Z\s\-',&]*$/.test(formData.cuisine_type)) {
      newErrors.cuisine_type = 'Only letters, spaces, and basic punctuation allowed';
    }

    if (!documents.business_license) newErrors.business_license = 'Business license is required';
    if (!documents.health_certificate) newErrors.health_certificate = 'Health certificate is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let restaurantExists = false;
      try {
        const existing = await api.get('/vendor/restaurant', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        restaurantExists = !!(existing.data && existing.data.id);
      } catch (err) {
        restaurantExists = false;
      }

      const restaurantPayload = {
        name: formData.name,
        description: formData.description,
        cuisine_type: formData.cuisine_type,
        address: formData.address,
        phone: formData.phone,
        delivery_fee: Number(formData.delivery_fee),
        business_registration_number: formData.business_registration_number,
        tax_clearance_number: formData.tax_clearance_number,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const restaurantResponse = restaurantExists
        ? await api.put('/vendor/restaurant', restaurantPayload, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        : await api.post('/vendor/setup-restaurant', restaurantPayload, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

      const uploadPromises = [];
      const docKeys = ['business_license', 'health_certificate', 'halaal_certificate', 'bank_confirmation'];
      
      for (const docKey of docKeys) {
        if (documents[docKey]) {
          const uploadPromise = uploadDocument(docKey, documents[docKey]);
          uploadPromises.push(uploadPromise);
          toast.info(`Uploading ${docKey.replace('_', ' ')}...`);
        }
      }

      await Promise.all(uploadPromises);

      await api.put('/vendor/update-status', { vendor_status: 'pending' }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Restaurant created and documents submitted for review!');
      setSubmitted(true);
      
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        userData.vendor_status = 'pending';
        userData.business_license = 'submitted';
        userData.health_certificate = 'submitted';
        if (documents.halaal_certificate) userData.halaal_certificate = 'submitted';
        if (documents.bank_confirmation) userData.bank_confirmation = 'submitted';
        localStorage.setItem('user', JSON.stringify(userData));
      }

      navigate('/vendor-waiting');

    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to setup restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (checkingRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
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

              {/* Cuisine Type - Now with validation */}
              <div>
                <Label>Cuisine Type</Label>
                <Input
                  name="cuisine_type"
                  placeholder="e.g., Fast Food, Pizza, Sushi, Burgers"
                  value={formData.cuisine_type}
                  onChange={handleChange}
                  className={errors.cuisine_type ? 'border-red-500' : ''}
                />
                {errors.cuisine_type && <p className="text-xs text-red-500 mt-1">{errors.cuisine_type}</p>}
                <p className="text-xs text-gray-400 mt-1">Only letters, spaces, commas, apostrophes, and ampersands allowed</p>
              </div>

              {/* Address */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" />
                  Restaurant Address *
                </Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => setFormData({ ...formData, address: val })}
                  onSelect={handleAddressSelect}
                  placeholder="Full street address, city, postal code"
                  required
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-green-600 mt-1">✅ Location coordinates saved</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4" />
                  Contact Phone
                </Label>
                <Input
                  name="phone"
                  placeholder="0712345678"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                <p className="text-xs text-gray-400 mt-1">South African format (e.g., 0712345678)</p>
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
                  max="1000"
                  step="5"
                  className={errors.delivery_fee ? 'border-red-500' : ''}
                />
                {errors.delivery_fee && <p className="text-xs text-red-500 mt-1">{errors.delivery_fee}</p>}
                <p className="text-xs text-gray-400 mt-1">Between R0 and R1000</p>
              </div>

              {/* Business Registration */}
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Building className="w-4 h-4" />
                  Business Registration Number
                </Label>
                <Input
                  name="business_registration_number"
                  placeholder="YYYY/XXXXXX/XX"
                  value={formData.business_registration_number}
                  onChange={handleChange}
                  className={errors.business_registration_number ? 'border-red-500' : ''}
                />
                {errors.business_registration_number && <p className="text-xs text-red-500 mt-1">{errors.business_registration_number}</p>}
                <p className="text-xs text-gray-400 mt-1">Format: YYYY/XXXXXX/XX (e.g., 2020/123456/07)</p>
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
                {errors.business_license && <p className="text-xs text-red-500 mt-1">{errors.business_license}</p>}
                
                <FileUploadArea 
                  field="health_certificate" 
                  label="Health Certificate" 
                  required 
                  preview={previews.health_certificate}
                  description="Food safety or health department certificate"
                />
                {errors.health_certificate && <p className="text-xs text-red-500 mt-1">{errors.health_certificate}</p>}
                
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