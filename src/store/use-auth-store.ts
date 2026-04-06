import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteCookie } from 'cookies-next';

export interface VipInfo {
  vipStatus: number;
  vipType: number;
  vipExpireTime: string | null;
  isVip: boolean;
}

interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  integral?: number;
  vip?: VipInfo;
}

interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
  setToken: (token: string | null) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  updateVipStatus: (vip: VipInfo) => void;
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
      updateVipStatus: (vip) => set((state) => ({
        userInfo: state.userInfo ? { ...state.userInfo, vip } : null,
      })),
      logout: () => {
        localStorage.removeItem('token');
        deleteCookie('auth_uid');
        set({ token: null, userInfo: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
