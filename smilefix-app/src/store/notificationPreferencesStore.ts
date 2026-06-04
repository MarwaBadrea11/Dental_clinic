import { create } from 'zustand'
import {
  fetchPreferences,
  savePreferences,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '@/services/notificationService'

// ── Store interface ───────────────────────────────────────────────────────────

interface NotificationPreferencesState {
  preferences: NotificationPreferences
  isLoading: boolean
  isSaving: boolean
  /** True once loaded from API at least once */
  loaded: boolean
  error: string | null

  load: () => Promise<void>
  /**
   * Optimistically update a single toggle and persist to backend.
   * Reverts on failure.
   */
  toggle: (key: keyof NotificationPreferences, value: boolean) => Promise<void>
  /**
   * Persist the full current preferences object.
   * Call this from a "Save" button if you want batch-save behaviour.
   */
  save: () => Promise<void>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  (set, get) => ({
    preferences: { ...DEFAULT_PREFERENCES },
    isLoading:   false,
    isSaving:    false,
    loaded:      false,
    error:       null,

    load: async () => {
      if (get().loaded) return          // already fetched this session
      set({ isLoading: true, error: null })
      try {
        const prefs = await fetchPreferences()
        set({ preferences: prefs, isLoading: false, loaded: true })
      } catch {
        // Keep defaults — user hasn't set any preferences yet, or backend is down
        set({ isLoading: false, loaded: true })
      }
    },

    toggle: async (key, value) => {
      const previous = get().preferences
      // Optimistic update
      set((s) => ({ preferences: { ...s.preferences, [key]: value } }))
      try {
        const updated = await savePreferences({ [key]: value })
        set({ preferences: updated })
      } catch {
        // Revert on error
        set({ preferences: previous, error: 'Failed to save preference. Please try again.' })
        // Clear error after 4 s
        setTimeout(() => set({ error: null }), 4000)
      }
    },

    save: async () => {
      set({ isSaving: true, error: null })
      try {
        const updated = await savePreferences(get().preferences)
        set({ preferences: updated, isSaving: false })
      } catch {
        set({ isSaving: false, error: 'Failed to save preferences. Please try again.' })
        setTimeout(() => set({ error: null }), 4000)
      }
    },
  }),
)
