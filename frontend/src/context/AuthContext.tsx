import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

export interface LoginParams {
  identifier: string;
  password?: string;
  otp?: string;
  captchaToken: string;
}

export interface RegisterParams {
  identifier: string;
  password: string;
  fullName: string;
  otp: string;
  captchaToken: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (paramsOrIdentifier: LoginParams | string, password?: string, otp?: string, captchaToken?: string) => Promise<void>;
  register: (paramsOrIdentifier: RegisterParams | string, password?: string, fullName?: string) => Promise<void>;
  sendOtp: (identifier: string, purpose: 'register' | 'login') => Promise<{ success: boolean; message: string; devOtp?: string; expiresInSeconds: number; channel?: 'email' | 'sms' }>;
  verifyOtp: (identifier: string, otp: string, purpose?: 'register' | 'login') => Promise<{ success: boolean; message?: string; token?: string; user?: User; verificationToken?: string }>;
  logout: () => void;
  quickDemoLogin: (role?: 'user' | 'admin') => Promise<void>;
  updatePreferences: (prefs: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_EXPLORER_USER: User = {
  id: 'usr-admin-001',
  email: 'admin@prachi.ai',
  fullName: 'Prachi AI Explorer',
  role: 'admin',
  preferences: { theme: 'dark', defaultModel: 'gemini' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('prachi_user_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // use default
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('prachi_auth_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const u = await api.getMe();
          setUser(u);
          localStorage.setItem('prachi_user_cache', JSON.stringify(u));
          return;
        } catch (err) {
          console.warn('[Auth] Token invalid or expired, resetting session');
          localStorage.removeItem('prachi_auth_token');
          localStorage.removeItem('prachi_user_cache');
          setToken(null);
          setUser(null);
        }
      }
    }
    loadUser();
  }, [token]);

  const sendOtp = async (identifier: string, purpose: 'register' | 'login') => {
    return api.sendOtp(identifier, purpose);
  };

  const verifyOtp = async (identifier: string, otp: string, purpose: 'register' | 'login' = 'login') => {
    const res = await api.verifyOtp(identifier, otp, purpose);
    if (res.token && res.user) {
      localStorage.setItem('prachi_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const login = async (
    paramsOrIdentifier: LoginParams | string,
    password?: string,
    otp?: string,
    captchaToken?: string
  ) => {
    let payload: any;
    if (typeof paramsOrIdentifier === 'object') {
      payload = paramsOrIdentifier;
    } else {
      payload = {
        identifier: paramsOrIdentifier,
        password,
        otp,
        captchaToken: captchaToken || 'robot-verified-demo-token'
      };
    }

    try {
      const res = await api.login(payload);
      localStorage.setItem('prachi_auth_token', res.token);
      localStorage.setItem('prachi_user_cache', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      if (err.message && (err.message.includes('Unable to reach') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        console.warn('[Auth] Backend offline, establishing local offline session:', err.message);
        const cleanName = (payload.identifier || '').split('@')[0] || 'Prachi Explorer';
        const offlineUser: User = {
          id: `usr-${Date.now()}`,
          email: payload.identifier.includes('@') ? payload.identifier : `${payload.identifier}@prachi.ai`,
          fullName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          role: 'user',
          preferences: { theme: 'dark', defaultModel: 'local_heuristic' }
        };
        const offlineToken = `offline-token-${Date.now()}`;
        localStorage.setItem('prachi_auth_token', offlineToken);
        localStorage.setItem('prachi_user_cache', JSON.stringify(offlineUser));
        setToken(offlineToken);
        setUser(offlineUser);
        return;
      }
      throw err;
    }
  };

  const register = async (
    paramsOrIdentifier: RegisterParams | string,
    legacyPassword?: string,
    legacyFullName?: string
  ) => {
    let payload: any;
    if (typeof paramsOrIdentifier === 'object') {
      payload = paramsOrIdentifier;
    } else {
      payload = {
        identifier: paramsOrIdentifier,
        password: legacyPassword || '',
        fullName: legacyFullName || '',
        otp: '000000',
        captchaToken: 'robot-verified-demo-token'
      };
    }

    try {
      const res = await api.register(payload);
      localStorage.setItem('prachi_auth_token', res.token);
      localStorage.setItem('prachi_user_cache', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      if (err.message && (err.message.includes('Unable to reach') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        console.warn('[Auth] Backend offline, registering in local offline session:', err.message);
        const offlineUser: User = {
          id: `usr-${Date.now()}`,
          email: payload.identifier.includes('@') ? payload.identifier : `${payload.identifier}@prachi.ai`,
          fullName: payload.fullName || 'Prachi Explorer',
          role: 'user',
          preferences: { theme: 'dark', defaultModel: 'local_heuristic' }
        };
        const offlineToken = `offline-token-${Date.now()}`;
        localStorage.setItem('prachi_auth_token', offlineToken);
        localStorage.setItem('prachi_user_cache', JSON.stringify(offlineUser));
        setToken(offlineToken);
        setUser(offlineUser);
        return;
      }
      throw err;
    }
  };

  const quickDemoLogin = async (role: 'user' | 'admin' = 'admin') => {
    try {
      if (role === 'admin') {
        await login({
          identifier: 'admin@prachi.ai',
          password: 'AdminPass2026!',
          captchaToken: 'robot-verified-demo-session'
        });
      } else {
        await login({
          identifier: 'demo@prachi.ai',
          password: 'PrachiAI2026!',
          captchaToken: 'robot-verified-demo-session'
        });
      }
    } catch (err) {
      console.warn('Backend server offline, initiating local offline demo session:', err);
      const fallbackUser: User = {
        id: role === 'admin' ? 'usr-admin-001' : 'usr-demo-001',
        email: role === 'admin' ? 'admin@prachi.ai' : 'demo@prachi.ai',
        fullName: role === 'admin' ? 'Prachi AI Explorer' : 'Pari (Demo User)',
        role: role === 'admin' ? 'admin' : 'user',
        preferences: { theme: 'dark', defaultModel: 'local_heuristic' }
      };
      const fallbackToken = 'local-offline-demo-token';
      localStorage.setItem('prachi_auth_token', fallbackToken);
      localStorage.setItem('prachi_user_cache', JSON.stringify(fallbackUser));
      setToken(fallbackToken);
      setUser(fallbackUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('prachi_auth_token');
    localStorage.removeItem('prachi_user_cache');
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (prefs: Record<string, any>) => {
    await api.updatePreferences(prefs);
    if (user) {
      setUser({ ...user, preferences: { ...(user.preferences || {}), ...prefs } });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        sendOtp,
        verifyOtp,
        logout,
        quickDemoLogin,
        updatePreferences
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
