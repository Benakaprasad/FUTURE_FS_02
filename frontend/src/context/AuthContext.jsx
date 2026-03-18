import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchMe = async () => {
    const delays = [2000, 4000, 8000]; // retry at 2s, 4s, 8s
    
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setLoading(false);
        return; // ← success, stop retrying
      } catch (err) {
        if (err.response?.status === 429 && attempt < delays.length) {
          // Wait then retry
          await new Promise(res => setTimeout(res, delays[attempt]));
          continue;
        }
        // Either not a 429, or ran out of retries
        sessionStorage.removeItem('accessToken');
        setUser(null);
        setLoading(false);
        return;
      }
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

