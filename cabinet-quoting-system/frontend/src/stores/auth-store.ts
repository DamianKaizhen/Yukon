import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthState } from '@/types'
import { authApi } from '@/lib/api'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: any) => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(email, password)
          const { user, token } = response.data
          
          localStorage.setItem('auth_token', token)
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API error:', error)
        } finally {
          localStorage.removeItem('auth_token')
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(userData)
          const { user, token } = response.data
          
          localStorage.setItem('auth_token', token)
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          const user = await authApi.me()
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          localStorage.removeItem('auth_token')
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'cabinet-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)