import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type User = {
  id: number;
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  statusText?: string | null;
  isAnonymous: boolean;
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loginGuest: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<{ userId: number }>;
  verifyCode: (email: string, code: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  updateProfile: (displayName?: string, avatarUrl?: string, avatarSeed?: string, statusText?: string) => Promise<void>;
  heartbeat: () => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loginGuest: async () => {},
  register: async () => ({ userId: 0 }),
  verifyCode: async () => {},
  loginEmail: async () => {},
  updateProfile: async () => {},
  heartbeat: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('bookvibe_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bookvibe_token');
  });

  useEffect(() => {
    const t = localStorage.getItem('bookvibe_token');
    if (!t) return;
    const send = () => {
      fetch(`${API_URL}/auth/heartbeat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}` },
      }).catch(() => {});
    };
    send();
    const id = setInterval(send, 30_000);
    return () => clearInterval(id);
  }, [token]);

  const saveAuth = useCallback((newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    if (newUser && newToken) {
      localStorage.setItem('bookvibe_user', JSON.stringify(newUser));
      localStorage.setItem('bookvibe_token', newToken);
    } else {
      localStorage.removeItem('bookvibe_user');
      localStorage.removeItem('bookvibe_token');
    }
  }, []);

  const loginGuest = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST' });
      const data = await res.json();
      saveAuth(data.user, data.token);
    } catch (error) {
      console.error('Guest login failed:', error);
    }
  }, [saveAuth]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    saveAuth(data.user, data.token);
  }, [saveAuth]);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    saveAuth(data.user, data.token);
  }, [saveAuth]);

  const updateProfile = useCallback(async (displayName?: string, avatarUrl?: string, avatarSeed?: string, statusText?: string) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...(displayName && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(avatarSeed !== undefined && { avatarSeed }),
        ...(statusText !== undefined && { statusText }),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    saveAuth(data.user, token);
  }, [token, saveAuth]);

  const heartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/auth/heartbeat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch { /* silent */ }
  }, [token]);

  const logout = useCallback(() => {
    saveAuth(null, null);
  }, [saveAuth]);

  return { user, token, loginGuest, register, verifyCode, loginEmail, updateProfile, heartbeat, logout };
}
