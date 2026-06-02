import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const API = 'https://lloyds-delivery.onrender.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // LOAD SESSION (SOURCE OF TRUTH = /me)
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error();

        const data = await res.json();

        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }

      setLoading(false);
    };

    init();
  }, []);

 const login = async (email, password) => {
  try {
    const res = await fetch('https://lloyds-delivery.onrender.com/api/auth/login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Login failed");
      return null;
    }

    const token = data.token;
    const user = data.user;

    if (!user) {
      toast.error("Invalid server response");
      return null;
    }

    // FIX USER ID
    const fixedUser = fixUserId(user);

    // OPTIONAL: refresh full user from DB (safe version)
    const freshUserRes = await fetch(
      `https://lloyds-delivery.onrender.com/api/users/${fixedUser.id}`
    );

    let finalUser = fixedUser;

    if (freshUserRes.ok) {
      const freshUser = await freshUserRes.json();
      finalUser = { ...fixedUser, ...freshUser };
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(finalUser));

    setUser(finalUser);

    toast.success(`Welcome back, ${finalUser.name || finalUser.email}!`);

    return finalUser;
  } catch (err) {
    console.error(err);
    toast.error("Network error");
    return null;
  }
};

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login');
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