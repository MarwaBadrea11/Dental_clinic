import { create } from 'zustand'
import type { User } from '@/types'
import { logout as apiLogout, getAccessToken, getRefreshToken, getSavedUser, saveTokens } from '@/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: User) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  /** Call once on app boot to silently restore session via refresh token. */
  rehydrate: () => Promise<void>
}

function buildUser(saved: ReturnType<typeof getSavedUser>): User | null {
  if (!saved) return null
  return {
    id: saved.id,
    name: (saved as { name?: string }).name ?? saved.email,
    email: saved.email,
    role: (saved.role?.toLowerCase() ?? 'receptionist') as User['role'],
  }
}

function isTokenAlive(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && Date.now() < payload.exp * 1000 - 60_000
  } catch {
    return false
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  // Optimistically hydrate from localStorage — rehydrate() will correct this
  user: buildUser(getSavedUser()),
  isAuthenticated: !!getAccessToken(),
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: async () => {
    await apiLogout()
    set({ user: null, isAuthenticated: false })
  },

  setLoading: (isLoading) => set({ isLoading }),

  rehydrate: async () => {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()

    // Token is still valid — nothing to do
    if (accessToken && isTokenAlive(accessToken)) {
      const user = buildUser(getSavedUser())
      set({ user, isAuthenticated: !!user })
      return
    }

    // Access token missing or expired — try to refresh silently
    if (!refreshToken) {
      set({ user: null, isAuthenticated: false })
      return
    }

    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        set({ user: null, isAuthenticated: false })
        return
      }

      const json = await res.json()
      const { accessToken: newAccess, refreshToken: newRefresh } = json.data
      saveTokens(newAccess, newRefresh)

      const user = buildUser(getSavedUser())
      set({ user, isAuthenticated: !!user })
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },
}))
