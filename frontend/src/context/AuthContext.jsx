import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone              = useRef(false);   

  useEffect(() => {
    if (initDone.current) return;   
    initDone.current = true;

    const init = async () => {
      try {
        const { data: refreshData } = await api.post('/auth/refresh');
        sessionStorage.setItem('accessToken', refreshData.accessToken);

        const { data: meData } = await api.get('/auth/me');
        setUser(meData.user);
      } catch {
        sessionStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    sessionStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};