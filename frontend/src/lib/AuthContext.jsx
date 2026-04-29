import React, { createContext, useState, useContext, useEffect } from 'react';
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
  const navigate = useNavigate(); // Now this is safe because Router is parent

  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Temporary mock login - replace with real API later
      const mockUser = {
        id: 1,
        email: email,
        full_name: email.split('@')[0],
        role: 'customer'
      };
      
      localStorage.setItem('token', 'mock-token-123');
      localStorage.setItem('user', JSON.stringify(mockUser));
      setToken('mock-token-123');
      setUser(mockUser);
      toast.success('Login successful!');
      navigate('/');
      return { user: mockUser };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      toast.success('Registration successful! Please login.');
      navigate('/login');
      return { success: true };
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