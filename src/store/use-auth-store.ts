import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  integral?: number;
}

interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
  setToken: (token: string | null) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      setToken: (token) => {
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');
        set({ token });
      },
      setUserInfo: (userInfo) => set({ userInfo }),
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, userInfo: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
