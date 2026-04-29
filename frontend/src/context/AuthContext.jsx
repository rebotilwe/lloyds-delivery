import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Try to get user data from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      toast.success('Login successful!');
      return response;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      toast.success('Registration successful! Please login.');
      return response;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    token,
    isAuthenticated: !!token,
    isLoadingAuth: loading,
    isLoadingPublicSettings: false,
    authError: null,
    navigateToLogin: () => navigate('/login'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};