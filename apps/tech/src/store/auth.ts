import { create } from 'zustand';
import type { TechUser } from '../lib/queries';

interface AuthState {
  user: TechUser | null;
  setUser: (u: TechUser | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
