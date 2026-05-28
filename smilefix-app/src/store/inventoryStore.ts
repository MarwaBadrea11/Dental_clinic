import { create } from 'zustand'
import type { InventoryItem, Supplier, PurchaseOrder, StockStatus } from '@/types'

// ── Mock suppliers ────────────────────────────────────────────────────────────

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'DentalPro Supplies', contactPerson: 'Mark Evans', email: 'mark@dentalpro.com', phone: '+1 (800) 123-4567', address: '500 Medical Drive', city: 'Chicago', category: 'Consumables', website: 'dentalpro.com', status: 'active', totalOrders: 48, lastOrderDate: '2023-10-01', rating: 5 },
  { id: 's2', name: 'OralTech Instruments', contactPerson: 'Susan Lee', email: 'susan@oraltech.com', phone: '+1 (800) 234-5678', address: '200 Precision Blvd', city: 'Boston', category: 'Instruments', website: 'oraltech.com', status: 'active', totalOrders: 22, lastOrderDate: '2023-09-15', rating: 4 },
  { id: 's3', name: 'MedPharm Solutions', contactPerson: 'Carlos Rivera', email: 'carlos@medpharm.com', phone: '+1 (800) 345-6789', address: '88 Pharma Lane', city: 'Houston', category: 'Medications', website: 'medpharm.com', status: 'active', totalOrders: 35, lastOrderDate: '2023-10-05', rating: 5 },
  { id: 's4', name: 'SafeGuard PPE', contactPerson: 'Amy Chen', email: 'amy@safeguard.com', phone: '+1 (800) 456-7890', address: '12 Safety Court', city: 'Los Angeles', category: 'Protective Equipment', status: 'active', totalOrders: 19, lastOrderDate: '2023-09-28', rating: 4 },
  { id: 's5', name: 'ImpressionMaster', contactPerson: 'Tom Walsh', email: 'tom@impressionmaster.com', phone: '+1 (800) 567-8901', address: '77 Dental Row', city: 'New York', category: 'Impression Materials', status: 'inactive', totalOrders: 8, lastOrderDate: '2023-07-10', rating: 3 },
]

// ── Mock inventory ────────────────────────────────────────────────────────────

const today = new Date()
const futureDate = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }
const pastDate = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0] }

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'i1',  name: 'Nitrile Examination Gloves (M)', sku: 'PPE-GLV-M', category: 'Protective Equipment', quantity: 8,   unit: 'box',    minStock: 10, maxStock: 50, price: 12.99,  costPrice: 8.50,  supplierId: 's4', supplierName: 'SafeGuard PPE',       expiryDate: futureDate(180), location: 'Cabinet A1', status: 'low-stock',   lastRestocked: pastDate(30) },
  { id: 'i2',  name: 'Composite Resin A2 Shade',       sku: 'RES-A2',   category: 'Restorative',           quantity: 2,   unit: 'syringe',minStock: 5,  maxStock: 20, price: 45.00,  costPrice: 28.00, supplierId: 's1', supplierName: 'DentalPro Supplies',  expiryDate: futureDate(365), location: 'Cabinet B2', status: 'low-stock',   lastRestocked: pastDate(60) },
  { id: 'i3',  name: 'Dental Floss (Waxed)',            sku: 'CON-FLS',  category: 'Consumables',           quantity: 45,  unit: 'pack',   minStock: 20, maxStock: 100,price: 3.50,   costPrice: 1.80,  supplierId: 's1', supplierName: 'DentalPro Supplies',  expiryDate: futureDate(730), location: 'Cabinet A3', status: 'in-stock',    lastRestocked: pastDate(15) },
  { id: 'i4',  name: 'Amoxicillin 500mg Capsules',     sku: 'MED-AMX',  category: 'Medications',           quantity: 0,   unit: 'bottle', minStock: 3,  maxStock: 15, price: 18.00,  costPrice: 10.00, supplierId: 's3', supplierName: 'MedPharm Solutions',  expiryDate: futureDate(90),  location: 'Med Cabinet', status: 'out-of-stock', lastRestocked: pastDate(90) },
  { id: 'i5',  name: 'Dental Burs — Round #4',         sku: 'INS-BUR4', category: 'Instruments',           quantity: 24,  unit: 'pack',   minStock: 10, maxStock: 50, price: 22.00,  costPrice: 14.00, supplierId: 's2', supplierName: 'OralTech Instruments',expiryDate: undefined,       location: 'Instrument Tray', status: 'in-stock', lastRestocked: pastDate(20) },
  { id: 'i6',  name: 'Alginate Impression Material',   sku: 'IMP-ALG',  category: 'Impression Materials',  quantity: 12,  unit: 'bag',    minStock: 5,  maxStock: 30, price: 28.00,  costPrice: 16.00, supplierId: 's5', supplierName: 'ImpressionMaster',    expiryDate: futureDate(120), location: 'Cabinet C1', status: 'in-stock',    lastRestocked: pastDate(45) },
  { id: 'i7',  name: 'Surgical Face Masks (50pk)',     sku: 'PPE-MSK',  category: 'Protective Equipment',  quantity: 18,  unit: 'box',    minStock: 10, maxStock: 60, price: 9.99,   costPrice: 5.50,  supplierId: 's4', supplierName: 'SafeGuard PPE',       expiryDate: futureDate(365), location: 'Cabinet A1', status: 'in-stock',    lastRestocked: pastDate(10) },
  { id: 'i8',  name: 'Lidocaine 2% Cartridges',        sku: 'MED-LID',  category: 'Medications',           quantity: 6,   unit: 'box',    minStock: 4,  maxStock: 20, price: 35.00,  costPrice: 22.00, supplierId: 's3', supplierName: 'MedPharm Solutions',  expiryDate: futureDate(60),  location: 'Med Cabinet', status: 'low-stock',   lastRestocked: pastDate(50) },
  { id: 'i9',  name: 'Autoclave Pouches (200pk)',      sku: 'STR-ACP',  category: 'Sterilization',         quantity: 3,   unit: 'box',    minStock: 5,  maxStock: 20, price: 24.00,  costPrice: 14.00, supplierId: 's1', supplierName: 'DentalPro Supplies',  expiryDate: undefined,       location: 'Sterilization Room', status: 'low-stock', lastRestocked: pastDate(40) },
  { id: 'i10', name: 'Dental Mirror #5',               sku: 'INS-MIR5', category: 'Instruments',           quantity: 15,  unit: 'piece',  minStock: 5,  maxStock: 30, price: 8.50,   costPrice: 4.00,  supplierId: 's2', supplierName: 'OralTech Instruments',expiryDate: undefined,       location: 'Instrument Tray', status: 'in-stock', lastRestocked: pastDate(60) },
  { id: 'i11', name: 'Hydrogen Peroxide 35% Gel',      sku: 'COS-HPG',  category: 'Restorative',           quantity: 5,   unit: 'kit',    minStock: 3,  maxStock: 15, price: 65.00,  costPrice: 40.00, supplierId: 's1', supplierName: 'DentalPro Supplies',  expiryDate: futureDate(180), location: 'Cabinet B3', status: 'in-stock',    lastRestocked: pastDate(25) },
  { id: 'i12', name: 'Expired Impression Trays',       sku: 'IMP-TRY',  category: 'Impression Materials',  quantity: 4,   unit: 'set',    minStock: 2,  maxStock: 10, price: 15.00,  costPrice: 8.00,  supplierId: 's5', supplierName: 'ImpressionMaster',    expiryDate: pastDate(10),    location: 'Cabinet C2', status: 'expired',     lastRestocked: pastDate(200) },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface InventoryState {
  items: InventoryItem[]
  suppliers: Supplier[]
  orders: PurchaseOrder[]

  addItem: (item: InventoryItem) => void
  updateItem: (id: string, data: Partial<InventoryItem>) => void
  deleteItem: (id: string) => void
  restockItem: (id: string, quantity: number) => void

  addSupplier: (s: Supplier) => void
  updateSupplier: (id: string, data: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void

  getLowStockItems: () => InventoryItem[]
  getExpiredItems: () => InventoryItem[]
  getItemsByCategory: (category: string) => InventoryItem[]
  getTotalInventoryValue: () => number
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: MOCK_INVENTORY,
  suppliers: MOCK_SUPPLIERS,
  orders: [],

  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (id, data) =>
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...data } : i) })),
  deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  restockItem: (id, quantity) =>
    set((s) => ({
      items: s.items.map((i) => {
        if (i.id !== id) return i
        const newQty = i.quantity + quantity
        const status: StockStatus = newQty === 0 ? 'out-of-stock' : newQty <= i.minStock ? 'low-stock' : 'in-stock'
        return { ...i, quantity: newQty, status, lastRestocked: new Date().toISOString().split('T')[0] }
      }),
    })),

  addSupplier: (s) => set((st) => ({ suppliers: [s, ...st.suppliers] })),
  updateSupplier: (id, data) =>
    set((s) => ({ suppliers: s.suppliers.map((sup) => sup.id === id ? { ...sup, ...data } : sup) })),
  deleteSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((sup) => sup.id !== id) })),

  getLowStockItems: () => get().items.filter((i) => i.status === 'low-stock' || i.status === 'out-of-stock'),
  getExpiredItems: () => get().items.filter((i) => i.status === 'expired'),
  getItemsByCategory: (cat) => get().items.filter((i) => i.category === cat),
  getTotalInventoryValue: () => get().items.reduce((sum, i) => sum + i.quantity * (i.costPrice ?? i.price), 0),
}))
