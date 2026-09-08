import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Store, User, Truck, Eye, EyeOff, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleFromUrl = searchParams.get('role');
  const validRoles = ['customer', 'driver', 'vendor'];
  const initialRole = validRoles.includes(roleFromUrl) ? roleFromUrl : 'customer';

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: initialRole,
    phone: '',
    restaurant_name: '',
    restaurant_address: '',
    business_registration_number: '',
    restaurant_lat: null,
    restaurant_lng: null,
    vehicle_year: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Validation Functions ──
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) return true;
    if (digits.length === 11 && digits.startsWith('27')) return true;
    if (digits.length === 9) return true;
    return false;
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isValidLength = password.length >= 8;
    return { isValid: hasUpperCase && hasLowerCase && hasNumber && hasSpecial && isValidLength, details: { hasUpperCase, hasLowerCase, hasNumber, hasSpecial, isValidLength } };
  };

  const validateBRN = (brn) => {
    if (!brn) return true;
    const brnRegex = /^\d{4}\/\d{6}\/\d{2}$/;
    return brnRegex.test(brn);
  };

  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: '' };
    const { isValid, details } = validatePassword(password);
    const count = Object.values(details).filter(Boolean).length;
    if (count <= 2) return { label: 'Weak', color: 'text-red-500', bar: 'w-1/4 bg-red-500' };
    if (count <= 3) return { label: 'Fair', color: 'text-yellow-500', bar: 'w-2/4 bg-yellow-500' };
    if (count <= 4) return { label: 'Good', color: 'text-blue-500', bar: 'w-3/4 bg-blue-500' };
    return { label: 'Strong', color: 'text-green-600', bar: 'w-full bg-green-500' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setForm(prev => ({ ...prev, phone: value }));
    if (value && !validatePhone(value)) {
      setErrors(prev => ({ ...prev, phone: 'Please enter a valid South African phone number' }));
    } else {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, email: value }));
    if (value && !validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email (e.g., name@domain.com)' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, password: value }));
    if (value) {
      const { details } = validatePassword(value);
      if (form.confirm_password && value !== form.confirm_password) {
        setErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirm_password: '' }));
      }
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, confirm_password: value }));
    if (value && value !== form.password) {
      setErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirm_password: '' }));
    }
  };

  const handleAddressSelect = (fullAddress, coords) => {
    setForm(prev => ({
      ...prev,
      restaurant_address: fullAddress,
      restaurant_lat: coords?.lat || null,
      restaurant_lng: coords?.lng || null,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // ── Validation ──
    if (!form.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!form.email) newErrors.email = 'Email is required';
    else if (!validateEmail(form.email)) newErrors.email = 'Please enter a valid email';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else {
      const { isValid, details } = validatePassword(form.password);
      if (!isValid) newErrors.password = 'Password must include uppercase, lowercase, number, and special character';
    }
    if (!form.confirm_password) newErrors.confirm_password = 'Please confirm your password';
    else if (form.password !== form.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    if (form.phone && !validatePhone(form.phone)) newErrors.phone = 'Please enter a valid South African phone number';

    if (form.role === 'vendor') {
      if (!form.restaurant_name.trim()) newErrors.restaurant_name = 'Restaurant name is required';
      if (!form.restaurant_address.trim()) newErrors.restaurant_address = 'Restaurant address is required';
      if (form.business_registration_number && !validateBRN(form.business_registration_number)) {
        newErrors.business_registration_number = 'Format: YYYY/XXXXXX/XX';
      }
    }

    if (form.role === 'driver' && form.vehicle_year) {
      const year = parseInt(form.vehicle_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 2000 || year > currentYear) {
        newErrors.vehicle_year = `Year must be between 2000 and ${currentYear}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone,
        vehicle_year: form.vehicle_year,
      };

      if (form.role === 'vendor') {
        registrationData.vendor_status = 'pending';
        registrationData.business_registration_number = form.business_registration_number;
        registrationData.restaurant_lat = form.restaurant_lat;
        registrationData.restaurant_lng = form.restaurant_lng;
      }

      const res = await fetch('https://lloyds-delivery.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      const roleMessage = {
        customer: 'Account created successfully! Please login.',
        driver: 'Driver application submitted. Await admin approval.',
        vendor: 'Vendor application submitted! Please login to complete your profile.',
      };

      toast.success(roleMessage[form.role] || 'Account created successfully!');

      if (form.role === 'vendor') {
        localStorage.setItem('pending_vendor_restaurant', JSON.stringify({
          name: form.restaurant_name,
          address: form.restaurant_address,
          phone: form.phone,
          business_registration_number: form.business_registration_number,
          latitude: form.restaurant_lat,
          longitude: form.restaurant_lng,
        }));
      }

      navigate('/login');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(form.password);

  const RoleCard = ({ role, icon: Icon, title, description, selected }) => (
    <button
      type="button"
      onClick={() => setForm(prev => ({ ...prev, role }))}
      className={`p-3 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
          : 'border-gray-200 hover:border-navy/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
        selected ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">

        {/* ── Logo + heading ── */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-navy rounded-2xl p-3 inline-flex">
              <img src={logo} alt="Lloyd's Delivery" className="h-16 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-navy">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join Lloyd's Delivery today</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I want to sign up as...</label>
            <div className="grid grid-cols-3 gap-2">
              <RoleCard role="customer" icon={User} title="Customer" description="Order food" selected={form.role === 'customer'} />
              <RoleCard role="driver" icon={Truck} title="Driver" description="Deliver & earn" selected={form.role === 'driver'} />
              <RoleCard role="vendor" icon={Store} title="Vendor" description="Sell your food" selected={form.role === 'vendor'} />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              name="full_name"
              placeholder="Your full name"
              value={form.full_name}
              onChange={handleChange}
              className={`w-full ${errors.full_name ? 'border-red-500' : ''}`}
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleEmailChange}
              className={`w-full ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={handlePasswordChange}
                className={`w-full pr-10 ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  <div className={`h-1 rounded-full transition-all ${passwordStrength.bar}`} />
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                  <span className={/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-red-400'}>
                    {/[A-Z]/.test(form.password) ? '✅' : '❌'} Uppercase
                  </span>
                  <span className={/[a-z]/.test(form.password) ? 'text-green-600' : 'text-red-400'}>
                    {/[a-z]/.test(form.password) ? '✅' : '❌'} Lowercase
                  </span>
                  <span className={/[0-9]/.test(form.password) ? 'text-green-600' : 'text-red-400'}>
                    {/[0-9]/.test(form.password) ? '✅' : '❌'} Number
                  </span>
                  <span className={/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? 'text-green-600' : 'text-red-400'}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? '✅' : '❌'} Special
                  </span>
                  <span className={form.password.length >= 8 ? 'text-green-600' : 'text-red-400'}>
                    {form.password.length >= 8 ? '✅' : '❌'} 8+ chars
                  </span>
                </div>
                <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.label}
                </p>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Minimum 8 characters with uppercase, lowercase, number, and special character</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <Input
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={form.confirm_password}
              onChange={handleConfirmPasswordChange}
              className={`w-full ${errors.confirm_password ? 'border-red-500' : ''}`}
            />
            {form.confirm_password && form.password && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${form.password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                {form.password === form.confirm_password ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {form.password === form.confirm_password ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
            {errors.confirm_password && <p className="text-xs text-red-500 mt-1">{errors.confirm_password}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              name="phone"
              placeholder="0712345678"
              value={form.phone}
              onChange={handlePhoneChange}
              className={`w-full ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">South African format (e.g., 0712345678)</p>
          </div>

          {/* Driver-specific fields */}
          {form.role === 'driver' && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium text-navy">Vehicle Details</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model Year</label>
                <Input
                  type="number"
                  name="vehicle_year"
                  placeholder="e.g., 2022"
                  value={form.vehicle_year}
                  onChange={handleChange}
                  min={2000}
                  max={new Date().getFullYear()}
                  className={`w-full ${errors.vehicle_year ? 'border-red-500' : ''}`}
                />
                {errors.vehicle_year && <p className="text-xs text-red-500 mt-1">{errors.vehicle_year}</p>}
                <p className="text-xs text-gray-400 mt-1">Year must be between 2000 and {new Date().getFullYear()}</p>
              </div>
            </div>
          )}

          {/* Vendor-specific fields */}
          {form.role === 'vendor' && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium text-navy">Restaurant Details</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
                <Input
                  name="restaurant_name"
                  placeholder="e.g., Burger Palace"
                  value={form.restaurant_name}
                  onChange={handleChange}
                  className={`w-full ${errors.restaurant_name ? 'border-red-500' : ''}`}
                />
                {errors.restaurant_name && <p className="text-xs text-red-500 mt-1">{errors.restaurant_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Address *</label>
                <AddressAutocomplete
                  value={form.restaurant_address}
                  onChange={(val) => setForm(prev => ({ ...prev, restaurant_address: val }))}
                  onSelect={handleAddressSelect}
                  placeholder="Street address, city, postal code"
                  required
                />
                {errors.restaurant_address && <p className="text-xs text-red-500 mt-1">{errors.restaurant_address}</p>}
                {form.restaurant_lat && form.restaurant_lng && (
                  <p className="text-xs text-green-600 mt-1">✅ Location coordinates saved</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Business Registration Number (Optional)
                </label>
                <Input
                  name="business_registration_number"
                  placeholder="YYYY/XXXXXX/XX"
                  value={form.business_registration_number}
                  onChange={handleChange}
                  className={`w-full ${errors.business_registration_number ? 'border-red-500' : ''}`}
                />
                {errors.business_registration_number && <p className="text-xs text-red-500 mt-1">{errors.business_registration_number}</p>}
                <p className="text-xs text-gray-400 mt-1">Format: YYYY/XXXXXX/XX (e.g., 2020/123456/07)</p>
              </div>
            </div>
          )}

          {/* Role notes */}
          {form.role === 'driver' && (
            <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
              📋 Driver accounts require admin approval. You will need to upload documents after registration.
            </div>
          )}
          {form.role === 'vendor' && (
            <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg space-y-1">
              <p>🏪 Your restaurant will be reviewed before going live.</p>
              <p>📄 After registration, you'll need to upload:</p>
              <ul className="list-disc list-inside pl-2 text-blue-700">
                <li>Business License</li>
                <li>Health Certificate</li>
                <li>Halaal Certificate (optional)</li>
                <li>Bank Confirmation</li>
              </ul>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#1B3A5C', color: '#ffffff' }}
            className="w-full h-11 hover:opacity-90 transition"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} className="text-navy cursor-pointer font-medium hover:underline">
            Login
          </span>
        </p>

        <div className="text-center text-xs text-gray-400 pt-4 border-t mt-4">
          <p className="font-medium mb-1">Demo Accounts:</p>
          <p>🍔 Customer: customer@lloyds.com / 123456</p>
          <p>🚚 Driver: driver@lloyds.com / 123456</p>
          <p>🏪 Vendor: vendor@lloyds.com / 123456</p>
          <p>👑 Admin: admin@lloyds.com / 123456</p>
        </div>
      </div>
    </div>
  );
}