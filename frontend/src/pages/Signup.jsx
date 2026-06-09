import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Store, User, Truck, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'customer',
    phone: '',
    restaurant_name: '',
    restaurant_address: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Validate vendor-specific fields
    if (form.role === 'vendor') {
      if (!form.restaurant_name) {
        toast.error('Please enter your restaurant name');
        return;
      }
      if (!form.restaurant_address) {
        toast.error('Please enter your restaurant address');
        return;
      }
    }

    setLoading(true);

    try {
      // Register the user
      const res = await fetch('https://lloyds-delivery.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // If vendor, log in and create restaurant
      if (form.role === 'vendor') {
        // Login to get token
        const loginRes = await fetch('https://lloyds-delivery.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });

        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.user) {
          // Create restaurant for the vendor
          await fetch('https://lloyds-delivery.onrender.com/api/restaurants', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.token}`,
            },
            body: JSON.stringify({
              name: form.restaurant_name,
              address: form.restaurant_address,
              phone: form.phone,
              cuisine_type: 'Various',
              owner_id: loginData.user.id,
            }),
          });
        }
      }

      const roleMessage = {
        customer: 'Account created successfully! Please login.',
        driver: 'Driver application submitted. Await admin approval. You will be notified once approved.',
        vendor: 'Restaurant registered successfully! Please login.',
      };

      toast.success(roleMessage[form.role] || 'Account created successfully!');
      navigate('/login');

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const RoleCard = ({ role, icon: Icon, title, description, selected }) => (
    <button
      type="button"
      onClick={() => setForm(prev => ({ ...prev, role }))}
      className={`p-3 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-green bg-green/5 ring-2 ring-green/20'
          : 'border-gray-200 hover:border-green/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
        selected ? 'bg-green text-white' : 'bg-gray-100 text-gray-500'
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
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍔</div>
          <h1 className="text-2xl font-bold text-navy">
            Create Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Join Lloyd's Delivery today
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to sign up as...
            </label>
            <div className="grid grid-cols-3 gap-2">
              <RoleCard
                role="customer"
                icon={User}
                title="Customer"
                description="Order food"
                selected={form.role === 'customer'}
              />
              <RoleCard
                role="driver"
                icon={Truck}
                title="Driver"
                description="Deliver & earn"
                selected={form.role === 'driver'}
              />
              <RoleCard
                role="vendor"
                icon={Store}
                title="Vendor"
                description="Sell your food"
                selected={form.role === 'vendor'}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              name="full_name"
              placeholder="Your full name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              name="phone"
              placeholder="+27 XX XXX XXXX"
              value={form.phone}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          {/* Vendor-specific fields */}
          {form.role === 'vendor' && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium text-green">Restaurant Details</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name *
                </label>
                <Input
                  name="restaurant_name"
                  placeholder="e.g., Burger Palace"
                  value={form.restaurant_name}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Address *
                </label>
                <Input
                  name="restaurant_address"
                  placeholder="Street address, city, postal code"
                  value={form.restaurant_address}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Role-specific notes */}
          {form.role === 'driver' && (
            <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
              📋 Driver accounts require admin approval. You will need to upload documents after registration.
            </div>
          )}

          {form.role === 'vendor' && (
            <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
              🏪 Your restaurant will be reviewed before going live. You can manage your menu once approved.
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green-600 text-white h-11"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-green cursor-pointer font-medium hover:underline"
          >
            Login
          </span>
        </p>

        {/* Demo Accounts Info */}
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