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
        // Set token in api client for all future requests
        if (api.defaults) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Error restoring user:', err);
      }
    }
    setLoading(false);
  }, []);

  // LOGIN
  const login = async (email, password) => {
    try {
      const res = await fetch('https://lloyds-delivery.onrender.com/api/auth/login', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login failed");
        return null;
      }

      // Store token
      if (data.token) {
        localStorage.setItem("token", data.token);
        // Set token in api client
        if (api.defaults) {
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
      }
      
      // Get full user data from database (includes driver_status)
      const userRes = await fetch(`https://lloyds-delivery.onrender.com/api/users/${data.user.id}`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      const fullUserData = await userRes.json();
      
      localStorage.setItem("user", JSON.stringify(fullUserData));
      setUser(fullUserData);
      
      toast.success(`Welcome back, ${fullUserData.name || fullUserData.full_name || email}!`);
      return fullUserData;
      
    } catch (err) {
      console.error('Login error:', err);
      toast.error("Network error");
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