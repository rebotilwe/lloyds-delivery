import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts
  const demoLogin = (role) => {
    if (role === 'admin') {
      setEmail('admin@lloyds.com');
      setPassword('admin123');
    } else if (role === 'driver') {
      setEmail('driver@lloyds.com');
      setPassword('driver123');
    } else {
      setEmail('customer@lloyds.com');
      setPassword('customer123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-navy">
            Sign in to Lloyd's Delivery
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="rounded-t-md"
              />
            </div>
            <div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-b-md"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green hover:bg-green-600"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">Demo Accounts:</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => demoLogin('customer')} className="text-xs bg-blue-500 text-white px-3 py-1 rounded">
              Customer
            </button>
            <button onClick={() => demoLogin('driver')} className="text-xs bg-green-500 text-white px-3 py-1 rounded">
              Driver
            </button>
            <button onClick={() => demoLogin('admin')} className="text-xs bg-red-500 text-white px-3 py-1 rounded">
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}