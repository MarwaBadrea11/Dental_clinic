import { create } from 'zustand'
import type { User } from '@/types'
import {
  logout as apiLogout,
  getAccessToken,
  getRefreshToken,
  getSavedUser,
  saveTokens,
  clearTokens,
  clearUser,
  saveUser,
  fetchMe,
  resolveMediaUrl,
  persistAuthUser,
  type AuthUser,
} from '@/services/authService'
import { API_BASE } from '@/services/apiConfig'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: User) => void
  syncFromAuthUser: (authUser: AuthUser) => void
  logout: () => Promise<void>
  forceLogout: () => void
  setLoading: (loading: boolean) => void
  /** Call once on app boot to silently restore session via refresh token. */
  rehydrate: () => Promise<void>
}

function mapRole(role: string): User['role'] {
  const normalized = role.toLowerCase()
  if (normalized === 'admin') return 'admin'
  if (normalized === 'dentist' || normalized === 'doctor') return 'doctor'
  if (normalized === 'nurse') return 'nurse'
  return 'receptionist'
}

function buildUser(saved: ReturnType<typeof getSavedUser>): User | null {
  if (!saved) return null
  return {
    id: saved.id,
    name: saved.name ?? saved.username ?? saved.email,
    email: saved.email,
    role: mapRole(saved.role),
    specialty: saved.specialty ?? undefined,
    phone: saved.phone ?? undefined,
    bio: saved.bio ?? undefined,
    avatar: saved.avatar ?? resolveMediaUrl(saved.avatar_url),
  }
}

function authUserToStoreUser(authUser: AuthUser): User {
  const name = authUser.username?.trim()
    || authUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    id: authUser.id,
    name,
    email: authUser.email,
    role: mapRole(authUser.role),
    specialty: authUser.specialty ?? undefined,
    phone: authUser.phone ?? undefined,
    bio: authUser.bio ?? undefined,
    avatar: resolveMediaUrl(authUser.avatar_url),
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

async function ensureValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken()
  if (accessToken && isTokenAlive(accessToken)) return accessToken

  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return null

    const json = await res.json()
    const { accessToken: newAccess, refreshToken: newRefresh } = json.data
    saveTokens(newAccess, newRefresh)
    return newAccess as string
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  // Optimistically hydrate from localStorage — rehydrate() will correct this
  user: buildUser(getSavedUser()),
  isAuthenticated: !!getAccessToken(),
  isLoading: false,

  setUser: (user) => {
    saveUser({
      id: user.id,
      email: user.email,
      role: user.role.toUpperCase(),
      username: user.name,
      phone: user.phone ?? null,
      specialty: user.specialty ?? null,
      bio: user.bio ?? null,
      avatar: user.avatar,
    })
    set({ user, isAuthenticated: true })
  },

  syncFromAuthUser: (authUser) => {
    persistAuthUser(authUser)
    const user = authUserToStoreUser(authUser)
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    await apiLogout()
    set({ user: null, isAuthenticated: false })
  },

  forceLogout: () => {
    clearTokens()
    clearUser()
    set({ user: null, isAuthenticated: false })
  },

  setLoading: (isLoading) => set({ isLoading }),

  rehydrate: async () => {
    const token = await ensureValidAccessToken()

    if (!token) {
      clearTokens()
      clearUser()
      set({ user: null, isAuthenticated: false })
      return
    }

      const authUser = await fetchMe()
      persistAuthUser(authUser)
      const user = authUserToStoreUser(authUser)
      set({ user, isAuthenticated: true })
    } catch {
      const user = buildUser(getSavedUser())
      set({ user, isAuthenticated: !!user })
    }
  },
}))
