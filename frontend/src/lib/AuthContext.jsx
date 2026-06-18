import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // RESTORE SESSION
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (api.defaults) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error restoring user:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // LOGIN
  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login for:", email);
      
      const res = await fetch('https://lloyds-delivery.onrender.com/api/auth/login', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Login error response:", data);
        
        if (res.status === 403) {
          toast.error(data.message || "Your account is pending approval or has been rejected.");
        } else {
          toast.error(data.message || "Login failed");
        }
        return null;
      }

      console.log("✅ Login response received:", data);

      // Store token
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (api.defaults) {
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
      }
      
      // Get user data from response
      let userData = data.user;
      
      // If we have the user data with documents already, use it
      if (userData && userData.id) {
        console.log("📦 User data from login:", {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          vendor_status: userData.vendor_status,
          business_license: userData.business_license,
          health_certificate: userData.health_certificate,
          halaal_certificate: userData.halaal_certificate,
          bank_confirmation: userData.bank_confirmation,
        });
        
        // Ensure document fields exist (even if null)
        userData = {
          ...userData,
          business_license: userData.business_license || null,
          health_certificate: userData.health_certificate || null,
          halaal_certificate: userData.halaal_certificate || null,
          bank_confirmation: userData.bank_confirmation || null,
        };
        
        // Store the user data
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        toast.success(`Welcome back, ${userData.name || userData.full_name || email}!`);
        return userData;
      }
      
      // If we don't have user data, try to fetch it
      try {
        const userRes = await fetch(`https://lloyds-delivery.onrender.com/api/users/${userData?.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`
          }
        });
        
        if (userRes.ok) {
          const fullUserData = await userRes.json();
          console.log("📦 Full user data from /users endpoint:", fullUserData);
          
          // Merge and ensure all fields exist
          userData = {
            ...userData,
            ...fullUserData,
            business_license: fullUserData.business_license || null,
            health_certificate: fullUserData.health_certificate || null,
            halaal_certificate: fullUserData.halaal_certificate || null,
            bank_confirmation: fullUserData.bank_confirmation || null,
          };
          
          localStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
          toast.success(`Welcome back, ${userData.name || userData.full_name || email}!`);
          return userData;
        }
      } catch (err) {
        console.log("Could not fetch full user data, using login response data");
      }
      
      // Fallback: if we have some user data
      if (userData) {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        toast.success(`Welcome back, ${userData.name || userData.full_name || email}!`);
        return userData;
      }
      
      toast.error("Could not retrieve user data");
      return null;
      
    } catch (err) {
      console.error('Login error:', err);
      toast.error("Network error - please check your connection");
      return null;
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (api.defaults) {
      delete api.defaults.headers.common['Authorization'];
    }
    setUser(null);
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};