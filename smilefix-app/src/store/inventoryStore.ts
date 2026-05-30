import { create } from 'zustand'
import type { InventoryItem, StockStatus } from '@/types'
import {
  fetchInventory,
  fetchInventoryAlerts,
  createInventoryItem,
  updateInventoryItem,
  restockInventoryItem,
  deleteInventoryItem,
  type CreateInventoryPayload,
  type UpdateInventoryPayload,
} from '@/services/inventoryService'

// ── Store ─────────────────────────────────────────────────────────────────────

interface InventoryState {
  items: InventoryItem[]
  loading: boolean
  error: string | null

  // Sync helpers
  getLowStockItems: () => InventoryItem[]
  getExpiredItems: () => InventoryItem[]
  getItemsByCategory: (category: string) => InventoryItem[]
  getTotalInventoryValue: () => number

  // API actions
  loadInventory: (params?: { search?: string; category?: string; status?: string }) => Promise<void>
  addItem: (payload: CreateInventoryPayload) => Promise<InventoryItem>
  editItem: (id: string, payload: UpdateInventoryPayload) => Promise<InventoryItem>
  restockItem: (id: string, quantity: number) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  // ── Computed helpers ───────────────────────────────────────────────────────

  getLowStockItems: () =>
    get().items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock'),

  getExpiredItems: () =>
    get().items.filter((i) => i.status === 'expired'),

  getItemsByCategory: (cat) =>
    get().items.filter((i) => i.category === cat),

  getTotalInventoryValue: () =>
    get().items.reduce((sum, i) => sum + i.quantity * i.price, 0),

  // ── API actions ────────────────────────────────────────────────────────────

  loadInventory: async (params) => {
    set({ loading: true, error: null })
    try {
      const { items } = await fetchInventory(params)
      set({ items, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load inventory' })
    }
  },

  addItem: async (payload) => {
    const item = await createInventoryItem(payload)
    set((s) => ({ items: [item, ...s.items] }))
    return item
  },

  editItem: async (id, payload) => {
    const item = await updateInventoryItem(id, payload)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? item : i)) }))
    return item
  },

  restockItem: async (id, quantity) => {
    const item = await restockInventoryItem(id, quantity)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? item : i)) }))
  },

  deleteItem: async (id) => {
    const previous = get().items
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    try {
      await deleteInventoryItem(id)
    } catch (err) {
      set({ items: previous })
      throw err
    }
  },
}))
