import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SALES' | 'INSTALL' | 'SERVICE' | 'ADMIN';
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },
}));
