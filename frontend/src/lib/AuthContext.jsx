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
        
        // Handle specific error cases
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
      const userData = data.user;
      
      if (userData && userData.id) {
        // Try to get additional user data from /users endpoint
        try {
          const userRes = await fetch(`https://lloyds-delivery.onrender.com/api/users/${userData.id}`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });
          
          if (userRes.ok) {
            const fullUserData = await userRes.json();
            const mergedUser = { ...userData, ...fullUserData };
            localStorage.setItem("user", JSON.stringify(mergedUser));
            setUser(mergedUser);
            toast.success(`Welcome back, ${mergedUser.name || mergedUser.full_name || email}!`);
            return mergedUser;
          }
        } catch (err) {
          console.log("Could not fetch full user data, using login response data");
        }
      }
      
      // Fallback to login response data
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      toast.success(`Welcome back, ${userData.name || userData.full_name || email}!`);
      return userData;
      
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