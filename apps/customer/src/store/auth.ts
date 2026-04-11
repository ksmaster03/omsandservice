import { create } from 'zustand';
import type { CustomerMe } from '../lib/queries';

interface AuthState {
  me: CustomerMe | null;
  setMe: (me: CustomerMe | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  me: null,
  setMe: (me) => set({ me }),
}));
