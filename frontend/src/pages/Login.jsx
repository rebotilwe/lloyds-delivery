import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);

      if (!user) return;

      // Redirect based on role and status
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "driver") {
        // DriverGuard will handle driver status
        navigate("/driver");
      } else if (user.role === "vendor") {
        // Check vendor status and redirect accordingly
        if (user.vendor_status === "pending") {
          // Check if user has submitted any documents
          const hasDocuments = user.business_license || user.health_certificate || 
                               user.halaal_certificate || user.bank_confirmation;
          
          if (hasDocuments) {
            // Has documents - waiting for approval
            navigate("/vendor-waiting");
          } else {
            // No documents - need to onboard
            navigate("/vendor/onboarding");
          }
        } else if (user.vendor_status === "rejected") {
          navigate("/vendor-waiting");
        } else if (user.vendor_status === "approved") {
          // Check if they have a restaurant
          try {
            const response = await fetch('https://lloyds-delivery.onrender.com/api/vendor/restaurant', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            if (response.ok) {
              navigate("/vendor");
            } else {
              // No restaurant yet - need to onboard
              navigate("/vendor/onboarding");
            }
          } catch {
            navigate("/vendor/onboarding");
          }
        } else {
          // Default fallback - go to onboarding
          navigate("/vendor/onboarding");
        }
      } else {
        navigate("/");
      }

    } catch (err) {
      // Error already handled by auth context
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch("https://lloyds-delivery.onrender.com/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      toast.success("Password reset link sent to your email!");
      setShowResetModal(false);
      setResetEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setResetLoading(false);
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-sm text-green hover:text-green/80 transition"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green-600 text-white h-11"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to Lloyd's?</span>
          </div>
        </div>

        <Button
          onClick={() => navigate('/signup')}
          variant="outline"
          className="w-full border-green text-green hover:bg-green hover:text-white"
        >
          Create New Account
        </Button>

        <div className="text-center text-xs text-gray-400 pt-4 border-t">
          <p className="font-medium mb-1">Demo Accounts:</p>
          <p>🍔 Customer: customer@lloyds.com / 123456</p>
          <p>🚚 Driver: driver@lloyds.com / 123456</p>
          <p>🏪 Vendor: vendor@lloyds.com / 123456</p>
          <p>👑 Admin: admin@lloyds.com / 123456</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="flex-1 bg-green hover:bg-green/90 text-white"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}