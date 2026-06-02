import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Bike,
  Loader2,
  X,
  FileText,
  User,
  Mail,
  Phone,
  Info,
} from 'lucide-react';

export default function DriverOnboarding() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  const [documents, setDocuments] = useState({
    id_copy: null,
    pdp: null,
    profile_photo: null,
    bike_license: null,  // Changed from car_license
  });

  const [previews, setPreviews] = useState({
    id_copy: null,
    pdp: null,
    profile_photo: null,
    bike_license: null,
  });

  const [bikeInfo, setBikeInfo] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    license_plate: '',
    engine_cc: '', // Added for motorbikes
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleBikeInfoChange = (e) => {
    setBikeInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitDocs = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    if (!documents.id_copy || !documents.pdp || !documents.profile_photo) {
      toast.error("Please upload all required documents");
      return;
    }

    if (!bikeInfo.make || !bikeInfo.model || !bikeInfo.license_plate) {
      toast.error("Please complete bike information (Make, Model, License Plate)");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("userId", user.id);
      formData.append("car_info", JSON.stringify(bikeInfo));

      formData.append("id_copy", documents.id_copy);
      formData.append("pdp", documents.pdp);
      formData.append("profile_photo", documents.profile_photo);
      if (documents.bike_license) {
        formData.append("car_license", documents.bike_license); // Backend expects car_license field
      }

      const res = await fetch("https://lloyds-delivery.onrender.com/api/driver/onboarding", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Submission failed");
      }

      toast.success("Application submitted successfully!");
      setSubmitted(true);

      const updatedUser = {
        ...user,
        driver_status: "pending",
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
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

  const DriverInfoCard = () => (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 sm:p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green/20 flex items-center justify-center">
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-green" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm sm:text-base">{user?.name || user?.full_name || 'Driver'}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">{user.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green" />
      </div>
    );
  }

  // After submission, show Under Review
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <FileCheck className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-500" />
            <h2 className="text-xl sm:text-2xl font-bold">Under Review</h2>
            <p className="text-sm text-gray-500">
              Your application has been submitted and is being reviewed by admin.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              You will be notified once approved. This usually takes 24-48 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved state
  if (user.driver_status === 'approved') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-green-500" />
            <h2 className="text-xl sm:text-2xl font-bold">Approved!</h2>
            <p className="text-sm text-gray-500">
              Your driver account has been approved. You can now accept deliveries.
            </p>
            <Button 
              onClick={() => window.location.href = '/driver'} 
              className="mt-2 bg-green text-white"
            >
              Go to Driver Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected state
  if (user.driver_status === 'rejected') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500" />
            <h2 className="text-xl sm:text-2xl font-bold">Application Rejected</h2>
            <p className="text-sm text-gray-500">
              Your application was not approved. Please contact support for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding form
  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-3 sm:px-4">
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bike className="w-8 h-8 text-green" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Become a Delivery Rider</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Complete the form below to start delivering with your motorbike
            </p>
          </div>

          <DriverInfoCard />

          {/* Bike Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-green" />
              Motorbike Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Make *</Label>
                <Input 
                  name="make" 
                  placeholder="e.g., Honda, Yamaha, Suzuki" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Model *</Label>
                <Input 
                  name="model" 
                  placeholder="e.g., CBR 150, MT-15" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Year</Label>
                <Input 
                  name="year" 
                  placeholder="e.g., 2020" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Engine CC</Label>
                <Input 
                  name="engine_cc" 
                  placeholder="e.g., 150cc" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Color</Label>
                <Input 
                  name="color" 
                  placeholder="e.g., Red, Black" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs sm:text-sm">License Plate *</Label>
                <Input 
                  name="license_plate" 
                  placeholder="e.g., ABC 123 GP" 
                  onChange={handleBikeInfoChange}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Documents Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-green" />
              Required Documents
            </h3>
            
            <FileUploadArea 
              field="id_copy" 
              label="ID Copy / Passport" 
              required 
              preview={previews.id_copy}
              description="Clear photo of your ID or passport"
            />
            
            <FileUploadArea 
              field="pdp" 
              label="PDP License" 
              required 
              preview={previews.pdp}
              description="Professional Driving Permit (must have motorbike code)"
            />
            
            <FileUploadArea 
              field="profile_photo" 
              label="Profile Photo" 
              required 
              preview={previews.profile_photo}
              description="Recent photo of yourself"
            />
            
            <FileUploadArea 
              field="bike_license" 
              label="Bike License / Registration (Optional)" 
              required={false} 
              preview={previews.bike_license}
              description="Motorbike registration document"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm text-blue-700 font-medium">Requirements for Riders</p>
              <p className="text-[11px] sm:text-xs text-blue-600 mt-0.5">
                • Valid driver's license with motorbike code<br />
                • Valid Professional Driving Permit (PDP)<br />
                • Reliable motorbike in good condition<br />
                • Smartphone with GPS<br />
                • Processing takes 24-48 hours
              </p>
            </div>
          </div>

          <Button 
            onClick={submitDocs} 
            disabled={loading} 
            className="w-full bg-green hover:bg-green/90 text-white h-10 sm:h-11 text-sm sm:text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting Application...
              </>
            ) : (
              'Submit Rider Application'
            )}
          </Button>

          {(documents.id_copy || documents.pdp || documents.profile_photo) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {documents.id_copy && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ ID Uploaded</span>
              )}
              {documents.pdp && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ PDP Uploaded</span>
              )}
              {documents.profile_photo && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Photo Uploaded</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}