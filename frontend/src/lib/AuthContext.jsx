import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Helper to fix user IDs based on email
const fixUserId = (user) => {
  if (!user) return user;
  
  // Map emails to correct database IDs
  if (user.email === 'admin@lloyds.com' && user.id !== 4) {
    return { ...user, id: 4 };
  }
  if (user.email === 'driver@lloyds.com' && user.id !== 5) {
    return { ...user, id: 5 };
  }
  if (user.email === 'customer@lloyds.com' && user.id !== 6) {
    return { ...user, id: 6 };
  }
  return user;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // RESTORE SESSION
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const fixedUser = fixUserId(parsedUser);
      setUser(fixedUser);
      if (fixedUser !== parsedUser) {
        localStorage.setItem('user', JSON.stringify(fixedUser));
      }
    }
    setLoading(false);
  }, []);

  // LOGIN
  const login = async (email, password) => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
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

      // Fix the user ID before storing
      const fixedUser = fixUserId(data.user);
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(fixedUser));

      setUser(fixedUser);
      toast.success(`Welcome back, ${fixedUser.name || fixedUser.email}!`);

      return fixedUser;
    } catch (err) {
      toast.error("Network error");
      return null;
    }
  };

  // REGISTER
  const register = async (userData) => {
    try {
      toast.success('Account created. Please login.');
      navigate('/login');
    } catch (err) {
      toast.error('Registration failed');
      throw err;
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
        register,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};