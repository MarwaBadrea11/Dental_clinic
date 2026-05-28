import { create } from 'zustand'
import type { User } from '@/types'
import { logout as apiLogout, getAccessToken, getSavedUser } from '@/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: User) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
}

function hydrateUser(): User | null {
  const token = getAccessToken()
  if (!token) return null
  const saved = getSavedUser()
  if (!saved) return null
  return {
    id: saved.id,
    name: (saved as { name?: string }).name ?? saved.email,
    email: saved.email,
    role: (saved.role?.toLowerCase() ?? 'receptionist') as User['role'],
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: hydrateUser(),
  isAuthenticated: !!getAccessToken(),
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: async () => {
    await apiLogout()
    set({ user: null, isAuthenticated: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))
