// ─────────────────────────────────────────────────────────────────────────────
// Inventory Service — /api/v1/inventory
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { InventoryItem, InventoryCategory, StockStatus } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

export interface BackendInventoryItem {
  id: string
  material_name: string
  category: InventoryCategory
  quantity: number
  unit: string
  min_stock_alert: number
  expiry_date: string | null
  unit_price: string | number
  supplier_info: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed alert flags from service layer
  is_low_stock?: boolean
  is_near_expiry?: boolean
  is_expired?: boolean
}

export interface CreateInventoryPayload {
  material_name: string
  category: InventoryCategory
  quantity: number
  unit: string
  min_stock_alert: number
  expiry_date?: string | null
  unit_price: number
  supplier_info?: string | null
}

export type UpdateInventoryPayload = Partial<CreateInventoryPayload>

export interface InventoryAlertsResponse {
  low_stock: BackendInventoryItem[]
  near_expiry: BackendInventoryItem[]
  expired: BackendInventoryItem[]
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function computeStatus(item: BackendInventoryItem): StockStatus {
  const today = new Date().toISOString().split('T')[0]
  if (item.expiry_date && item.expiry_date < today) return 'expired'
  if (item.quantity === 0) return 'out-of-stock'
  if (item.quantity <= item.min_stock_alert) return 'low-stock'
  return 'in-stock'
}

export function mapInventoryItem(b: BackendInventoryItem): InventoryItem {
  return {
    id: b.id,
    name: b.material_name,
    category: b.category,
    quantity: b.quantity,
    unit: b.unit,
    minStock: b.min_stock_alert,
    price: Number(b.unit_price),
    supplierName: b.supplier_info ?? undefined,
    expiryDate: b.expiry_date ?? undefined,
    status: computeStatus(b),
    lastRestocked: b.updated_at?.split('T')[0],
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchInventory(params?: {
  search?: string
  category?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ items: InventoryItem[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.search)   qs.set('search',   params.search)
  if (params?.category) qs.set('category', params.category)
  if (params?.status)   qs.set('status',   params.status)
  if (params?.limit)    qs.set('limit',    String(params.limit))
  if (params?.offset)   qs.set('offset',   String(params.offset))

  const query = qs.toString() ? `?${qs}` : ''

  const { getAccessToken } = await import('./authService')
  const { API_BASE } = await import('./apiClient')
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}/api/v1/inventory${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = await res.json()
  const rows: BackendInventoryItem[] = Array.isArray(json.data) ? json.data : []
  const total: number = json.meta?.total ?? rows.length
  return { items: rows.map(mapInventoryItem), total }
}

export async function fetchInventoryAlerts(): Promise<{
  lowStock: InventoryItem[]
  nearExpiry: InventoryItem[]
  expired: InventoryItem[]
}> {
  const data = await apiClient.get<InventoryAlertsResponse>('/inventory/alerts')
  return {
    lowStock: data.low_stock.map(mapInventoryItem),
    nearExpiry: data.near_expiry.map(mapInventoryItem),
    expired: data.expired.map(mapInventoryItem),
  }
}

export async function createInventoryItem(payload: CreateInventoryPayload): Promise<InventoryItem> {
  const b = await apiClient.post<BackendInventoryItem>('/inventory', payload)
  return mapInventoryItem(b)
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryPayload): Promise<InventoryItem> {
  const b = await apiClient.put<BackendInventoryItem>(`/inventory/${id}`, payload)
  return mapInventoryItem(b)
}

export async function restockInventoryItem(id: string, quantity: number): Promise<InventoryItem> {
  const b = await apiClient.post<BackendInventoryItem>(`/inventory/${id}/restock`, { quantity })
  return mapInventoryItem(b)
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/inventory/${id}`)
}
