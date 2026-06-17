import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  _id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  role: string;
  sessionsCreated: number;
  snapshotsUploaded: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; fullName?: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('db_access_token', accessToken);
    localStorage.setItem('db_refresh_token', refreshToken);
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem('db_access_token', data.accessToken);
      localStorage.setItem('db_refresh_token', data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err) { set({ isLoading: false }); throw err; }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(payload);
      localStorage.setItem('db_access_token', data.accessToken);
      localStorage.setItem('db_refresh_token', data.refreshToken);
      set({ user: data.user, isLoading: false });
    } catch (err) { set({ isLoading: false }); throw err; }
  },

  logout: () => {
    localStorage.removeItem('db_access_token');
    localStorage.removeItem('db_refresh_token');
    set({ user: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('db_access_token');
    if (!token) { set({ isInitialized: true }); return; }
    try {
      const data = await authApi.me();
      set({ user: data.user, isInitialized: true });
    } catch {
      localStorage.removeItem('db_access_token');
      localStorage.removeItem('db_refresh_token');
      set({ user: null, isInitialized: true });
    }
  },
}));
