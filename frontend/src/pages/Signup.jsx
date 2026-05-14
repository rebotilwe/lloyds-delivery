import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'customer',
  });

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

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      toast.success(
        form.role === 'driver'
          ? 'Driver application submitted. Await admin approval.'
          : 'Account created successfully! Please login.'
      );

      navigate('/login');

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow">

        <h1 className="text-2xl font-bold text-center text-navy">
          Create Account
        </h1>

        <p className="text-sm text-gray-500 text-center mb-6">
          Join Lloyd's Delivery
        </p>

        <form onSubmit={handleSignup} className="space-y-4">

          <Input
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
          />

          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />

          <Input
            name="password"
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={handleChange}
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border rounded-md p-2 text-sm"
          >
            <option value="customer">Customer</option>
            <option value="driver">Driver (Requires Approval)</option>
          </select>

          {form.role === 'driver' && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
              Driver accounts require admin approval before activation.
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green-600 text-white"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-green cursor-pointer font-medium"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}