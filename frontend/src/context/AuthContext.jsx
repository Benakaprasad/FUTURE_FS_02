import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchMe = async () => {
    // If no token in session, try a silent refresh FIRST
    // instead of letting /auth/me fail → interceptor → refresh → retry
    const existingToken = sessionStorage.getItem('accessToken');
    
    if (!existingToken) {
      // Try to get a new access token silently via refresh cookie
      try {
        const { data } = await api.post('/auth/refresh');
        sessionStorage.setItem('accessToken', data.accessToken);
      } catch {
        // No valid refresh cookie → user is logged out, stop here
        setUser(null);
        setLoading(false);
        return;
      }
    }

    // Now we definitely have a token — call /auth/me exactly once
    try {
      // In AuthContext, mark the initial /auth/me so interceptor won't double-retry it
    const { data } = await api.get('/auth/me', { _isAuthInit: true });
      setUser(data.user);
    } catch {
      sessionStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  fetchMe();
}, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    sessionStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// In AuthContext.jsx — make sure useAuth has a fallback
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

