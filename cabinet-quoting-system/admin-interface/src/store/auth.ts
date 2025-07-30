import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';
import { apiClient } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login({ email, password });
          localStorage.setItem('admin_token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('admin_token');
        apiClient.logout().catch(console.error);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const user = await apiClient.getProfile();
          set({
            user,
            token,
            isAuthenticated: true,
          });
        } catch (error) {
          localStorage.removeItem('admin_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper functions
export const isAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN;
};

export const isSalesOrAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.SALES;
};

export const hasPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  
  const roleHierarchy = {
    [UserRole.VIEWER]: 1,
    [UserRole.SALES]: 2,
    [UserRole.ADMIN]: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};