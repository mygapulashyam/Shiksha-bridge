import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('sb_user');
      return u ? JSON.parse(u) : null;
    } catch {
      localStorage.removeItem('sb_user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('sb_token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.data);
          localStorage.setItem('sb_user', JSON.stringify(data.data));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    verify();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sb_token', data.token);
    localStorage.setItem('sb_refresh_token', data.refreshToken);
    localStorage.setItem('sb_user', JSON.stringify(data.data));
    setUser(data.data);
    return data.data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('sb_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      // Continue client cleanup even if network request fails
    } finally {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_refresh_token');
      localStorage.removeItem('sb_user');
      setUser(null);
    }
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('sb_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
