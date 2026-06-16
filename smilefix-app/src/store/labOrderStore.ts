import { create } from 'zustand'
import type { LabOrder } from '@/types'

interface LabOrderState {
  orders: LabOrder[]
  loading: boolean
  error: string | null
  loadLabOrders: () => Promise<void>
}

export const useLabOrderStore = create<LabOrderState>((set) => ({
  orders: [],
  loading: false,
  error: null,

  loadLabOrders: async () => {
    set({ loading: true, error: null })
    try {
      // Placeholder until lab orders API is connected — preserves empty stats without mock data
      set({ orders: [], loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load lab orders',
      })
    }
  },
}))
