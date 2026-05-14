import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

  // -----------------------------
  // RESTORE SESSION
  // -----------------------------
  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // -----------------------------
  // LOGIN
  // -----------------------------
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
      return null; // 🔥 IMPORTANT (NO THROW)
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    toast.success("Login successful");

    return data.user;

  } catch (err) {
    toast.error("Network error");
    return null;
  }
};

  // -----------------------------
  // REGISTER
  // -----------------------------
  const register = async (userData) => {
    try {
      toast.success('Account created. Please login.');
      navigate('/login');
    } catch (err) {
      toast.error('Registration failed');
      throw err;
    }
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
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