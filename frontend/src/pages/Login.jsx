import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);

      if (!user) return;

      if (user.role === "admin") navigate("/admin");
      else if (user.role === "driver") navigate("/driver");
      else navigate("/");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">

        <div className="text-center">
          <div className="text-4xl mb-2">🍔</div>
          <h2 className="text-2xl font-bold text-navy">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green-600 text-white h-11"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to Lloyd's?</span>
          </div>
        </div>

        {/* Signup Button */}
        <Button
          onClick={() => navigate('/signup')}
          variant="outline"
          className="w-full border-green text-green hover:bg-green hover:text-white"
        >
          Create New Account
        </Button>

        {/* Demo Accounts Info */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t">
          <p className="font-medium mb-1">Demo Accounts:</p>
          <p>📧 admin@lloyds.com / 123456 (Admin)</p>
          <p>📧 driver@lloyds.com / 123456 (Driver)</p>
          <p>📧 customer@lloyds.com / 123456 (Customer)</p>
        </div>

      </div>
    </div>
  );
}