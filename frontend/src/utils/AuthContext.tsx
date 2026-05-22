import React, { createContext, useContext, useState, useEffect } from 'react';
import API from './api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  githubLogin: (code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('collabcode_token');
      if (token) {
        try {
          const { data } = await API.get('/auth/profile');
          setUser(data);
        } catch (err) {
          localStorage.removeItem('collabcode_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('collabcode_token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const { data } = await API.post('/auth/signup', { name, email, password });
      localStorage.setItem('collabcode_token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
      throw err;
    }
  };

  const githubLogin = async (code: string) => {
    setError(null);
    try {
      const { data } = await API.post('/auth/github', { code });
      localStorage.setItem('collabcode_token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'GitHub Login failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('collabcode_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, githubLogin, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
