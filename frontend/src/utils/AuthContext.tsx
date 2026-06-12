import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import API from './api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  stats?: {
    contributions: number;
    roomsCreated: number;
    collaborators: number;
  };
  githubId?: string;
  googleId?: string;
  editorSettings?: {
    theme: string;
    fontSize: number;
    fontLigatures: boolean;
    lineNumbers: string;
    minimap: boolean;
  };
  notificationSettings?: {
    email: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ email: string } | void>;
  githubLogin: (code: string) => Promise<void>;
  googleLogin: (code: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const { data } = await API.get('/auth/profile');
        setUser(data);
      } catch (err) {
        setUser(null);
      }
      setLoading(false);
    };
    checkLoggedIn();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Shared Socket Management
  useEffect(() => {
    let activeSocket: Socket | null = null;

    if (user && !socket) {
      const socketUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001').trim();
      const token = localStorage.getItem('token');
      
      activeSocket = io(socketUrl, {
        withCredentials: true,
        autoConnect: true,
        auth: { token },
      });

      activeSocket.on('connect', () => {
        activeSocket?.emit('join-room', `user_${user.id}`);
      });

      activeSocket.on('connect_error', (err) => {
        if (err.message.includes('Authentication error')) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      });

      setSocket(activeSocket);
    }

    return () => {
      if (!user && socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [user, socket]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (data.token) localStorage.setItem('token', data.token);
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
      return { email: data.email };
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
      throw err;
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setError(null);
    try {
      const { data } = await API.post('/auth/verify-otp', { email, otp });
      if (data.token) localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
      throw err;
    }
  };

  const resendOTP = async (email: string) => {
    setError(null);
    try {
      await API.post('/auth/resend-otp', { email });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Resend failed');
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      await API.post('/auth/forgot-password', { email });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Forgot password request failed');
      throw err;
    }
  };

  const resetPassword = async (email: string, otp: string, password: string) => {
    setError(null);
    try {
      await API.post('/auth/reset-password', { email, otp, password });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed');
      throw err;
    }
  };

  const githubLogin = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await API.post('/auth/github', { code });
      if (data.token) localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'GitHub Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await API.post('/auth/google', { code });
      if (data.token) localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await API.get('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        githubLogin,
        googleLogin,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        logout,
        updateUser,
        loading,
        error,
        socket,
      }}
    >
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
