'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, getUser, getToken, setAuth, clearAuth } from '@/lib/auth';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { speakAlert } from '@/lib/utils';

// Auth Context
interface AuthContextType {
  user: User | null;
  token: string | null;
  loginUser: (token: string, user: User) => void;
  logout: () => void;
  isDoctor: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loginUser: () => {},
  logout: () => {},
  isDoctor: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// Socket Context
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

// Theme Context
interface ThemeContextType {
  dark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  dark: false,
  toggleDark: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Voice alert setting
interface SettingsContextType {
  voiceAlerts: boolean;
  toggleVoiceAlerts: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  voiceAlerts: false,
  toggleVoiceAlerts: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocketState] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [dark, setDark] = useState(false);
  const [voiceAlerts, setVoiceAlerts] = useState(false);

  // Init auth from localStorage
  useEffect(() => {
    const savedUser = getUser();
    const savedToken = getToken();
    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
    }
  }, []);

  // Init theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('icu_dark_mode');
    if (savedTheme === 'true') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Init socket when authenticated
  useEffect(() => {
    if (token) {
      const s = getSocket();
      setSocketState(s);

      s.on('connect', () => {
        setConnected(true);
      });

      s.on('disconnect', () => {
        setConnected(false);
      });

      // Listen for critical alerts and show toast + voice
      s.on('newAlert', (alert: { severity: string; message: string; patientName: string }) => {
        if (alert.severity === 'critical') {
          toast.error(alert.message, { duration: 8000, icon: '🚨' });
          if (voiceAlerts) {
            speakAlert(`Critical alert: ${alert.message}`);
          }
        } else if (alert.severity === 'medium') {
          toast(alert.message, { duration: 5000, icon: '⚠️' });
        }
      });

      return () => {
        s.off('connect');
        s.off('disconnect');
        s.off('newAlert');
      };
    }
  }, [token, voiceAlerts]);

  const loginUser = useCallback((newToken: string, newUser: User) => {
    setAuth(newToken, newUser);
    setUser(newUser);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    disconnectSocket();
    setUser(null);
    setToken(null);
    setSocketState(null);
    setConnected(false);
  }, []);

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem('icu_dark_mode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  const toggleVoiceAlerts = useCallback(() => {
    setVoiceAlerts(prev => !prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logout, isDoctor: user?.role === 'doctor' }}>
      <SocketContext.Provider value={{ socket, connected }}>
        <ThemeContext.Provider value={{ dark, toggleDark }}>
          <SettingsContext.Provider value={{ voiceAlerts, toggleVoiceAlerts }}>
            {children}
          </SettingsContext.Provider>
        </ThemeContext.Provider>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}
