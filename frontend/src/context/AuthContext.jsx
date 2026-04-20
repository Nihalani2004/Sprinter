import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token && !!user;

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { username, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (username, password, role) => {
    setLoading(true);
    try {
      const res = await API.post('/auth/signup', { username, password, role });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
