import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Car,
  Loader2,
  X,
  FileText,
} from 'lucide-react';

export default function DriverOnboarding() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [documents, setDocuments] = useState({
    id_copy: null,
    pdp: null,
    profile_photo: null,
    car_license: null,
  });

  const [previews, setPreviews] = useState({
    id_copy: null,
    pdp: null,
    profile_photo: null,
    car_license: null,
  });

  const [carInfo, setCarInfo] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    license_plate: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
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

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);

    setDocuments(prev => ({ ...prev, [field]: file }));
  };

  const removeFile = (field) => {
    setDocuments(prev => ({ ...prev, [field]: null }));
    setPreviews(prev => ({ ...prev, [field]: null }));
  };

  const handleCarInfoChange = (e) => {
    setCarInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

    if (!carInfo.make || !carInfo.model || !carInfo.license_plate) {
      toast.error("Please complete car information");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("userId", user.id);
      formData.append("car_info", JSON.stringify(carInfo));

      formData.append("id_copy", documents.id_copy);
      formData.append("pdp", documents.pdp);
      formData.append("profile_photo", documents.profile_photo);
      if (documents.car_license) {
        formData.append("car_license", documents.car_license);
      }

      const res = await fetch("http://localhost:5000/api/driver/onboarding", {
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

  const FileUploadArea = ({ field, label, required, preview }) => (
    <div className="border rounded-lg p-4">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {preview ? (
        <div className="relative">
          {preview.startsWith('data:image') ? (
            <img src={preview} alt={label} className="w-full h-40 object-cover rounded-lg" />
          ) : (
            <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <button
            onClick={() => removeFile(field)}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Click to upload {label}</p>
            <p className="text-xs text-gray-400">JPG, PNG, PDF (max 5MB)</p>
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (submitted || user.driver_status === 'pending') {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <FileCheck className="w-10 h-10 mx-auto text-yellow-500" />
            <h2 className="text-xl font-bold">Under Review</h2>
            <p className="text-gray-500">
              Your application is being reviewed by admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.driver_status === 'approved') {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
            <h2 className="text-xl font-bold">Approved!</h2>
            <p className="text-gray-500">
              Your driver account has been approved. You can now accept deliveries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Driver Onboarding</h2>
            <p className="text-sm text-gray-500">
              Upload your documents to get approved
            </p>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Car className="w-5 h-5" /> Vehicle Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input name="make" placeholder="Make (e.g., Toyota)" onChange={handleCarInfoChange} />
              <Input name="model" placeholder="Model (e.g., Corolla)" onChange={handleCarInfoChange} />
              <Input name="year" placeholder="Year" onChange={handleCarInfoChange} />
              <Input name="color" placeholder="Color" onChange={handleCarInfoChange} />
              <Input name="license_plate" placeholder="License Plate *" onChange={handleCarInfoChange} className="col-span-2" />
            </div>
          </div>

          {/* Documents Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" /> Required Documents
            </h3>
            
            <FileUploadArea 
              field="id_copy" 
              label="ID Copy / Passport" 
              required 
              preview={previews.id_copy} 
            />
            
            <FileUploadArea 
              field="pdp" 
              label="PDP License" 
              required 
              preview={previews.pdp} 
            />
            
            <FileUploadArea 
              field="profile_photo" 
              label="Profile Photo" 
              required 
              preview={previews.profile_photo} 
            />
            
            <FileUploadArea 
              field="car_license" 
              label="Vehicle License (Optional)" 
              required={false} 
              preview={previews.car_license} 
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700">
              Documents will be reviewed within 24–48 hours. You will be notified once approved.
            </p>
          </div>

          <Button onClick={submitDocs} disabled={loading} className="w-full bg-green hover:bg-green/600">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}