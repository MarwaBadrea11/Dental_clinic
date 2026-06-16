// ── Common UI Types ──────────────────────────────────────────────────────────

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'outline'
export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'scheduled'
export type ColorScheme = 'light' | 'dark'

// ── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
  children?: NavItem[]
}

// ── User / Auth ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse'
  specialty?: string
  phone?: string
  bio?: string
  avatar?: string
}

// ── Patient ───────────────────────────────────────────────────────────────────

export interface Patient {
  id: string
  patientCode: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  email?: string
  address?: string
  city?: string
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  allergies?: string[]
  /** Nested emergency contact (legacy shape) */
  emergencyContact?: { name: string; phone: string; relation: string }
  /** Flat emergency contact fields (used by form & info section) */
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  avatar?: string
  lastVisit?: string
  nextAppointment?: string
  assignedDoctor?: string
  insuranceProvider?: string
  /** @deprecated use insurancePolicyNumber */
  insuranceNumber?: string
  insurancePolicyNumber?: string
  /** Free-text medical history */
  medicalHistory?: string
  /** Clinical notes by the doctor */
  clinicalNotes?: string
  notes?: string
  status: Status
  balance?: number
  createdAt?: string
}

export interface MedicalHistoryEntry {
  id: string
  patientId: string
  date: string
  type: 'treatment' | 'diagnosis' | 'prescription' | 'note' | 'xray' | 'appointment'
  title: string
  description: string
  doctor: string
  attachments?: Attachment[]
  cost?: number
  status?: Status
}

export interface Attachment {
  id: string
  name: string
  type: 'image' | 'pdf' | 'xray' | 'document'
  url: string
  size: string
  uploadedAt: string
  uploadedBy: string
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  patientCode?: string
  doctorId: string
  doctorName: string
  date: string
  startTime: string
  endTime: string
  treatment: string
  treatmentCategory?: string
  status: AppointmentStatus
  notes?: string
  chair?: number
  color?: string
}

// ── Treatment ─────────────────────────────────────────────────────────────────

export type TreatmentCategory =
  | 'Preventive' | 'Restorative' | 'Endodontic' | 'Periodontic'
  | 'Prosthodontic' | 'Orthodontic' | 'Oral Surgery' | 'Cosmetic'

export interface Treatment {
  id: string
  name: string
  category: TreatmentCategory
  duration: number
  price: number
  description?: string
  color?: string
  icon?: string
  steps?: string[]
  materials?: string[]
}

export interface PatientTreatment {
  id: string
  patientId: string
  treatmentId: string
  treatmentName: string
  category: TreatmentCategory
  toothNumbers?: number[]
  startDate: string
  endDate?: string
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled'
  doctor: string
  cost: number
  notes?: string
  sessions?: TreatmentSession[]
}

export interface TreatmentSession {
  id: string
  date: string
  duration: number
  notes: string
  doctor: string
  completed: boolean
}

// ── Odontogram ────────────────────────────────────────────────────────────────

export type ToothSurface = 'mesial' | 'distal' | 'occlusal' | 'buccal' | 'lingual' | 'root'
export type ToothCondition =
  | 'healthy' | 'caries' | 'filled' | 'crown' | 'missing'
  | 'implant' | 'bridge' | 'root-canal' | 'extraction' | 'fracture'

export interface ToothRecord {
  toothNumber: number
  surfaces: Partial<Record<ToothSurface, ToothCondition>>
  condition: ToothCondition
  notes?: string
  lastUpdated?: string
}

export interface OdontogramRecord {
  id: string
  patientId: string
  createdAt: string
  updatedAt: string
  teeth: Record<number, ToothRecord>
  notes?: string
  doctor: string
}

// ── Invoice / Finance ─────────────────────────────────────────────────────────

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'partial' | 'draft'
export type PaymentMethod = 'cash' | 'card' | 'insurance' | 'bank-transfer' | 'check'

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId: string
  patientName: string
  patientCode?: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  total: number
  paid: number
  discount?: number
  tax?: number
  status: InvoiceStatus
  paymentMethod?: PaymentMethod
  notes?: string
  createdBy?: string
}

export interface InvoiceItem {
  id: string
  description: string
  treatmentId?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Payment {
  id: string
  invoiceId: string
  patientId: string
  patientName: string
  amount: number
  method: PaymentMethod
  date: string
  reference?: string
  notes?: string
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export type InventoryCategory =
  | 'Consumables' | 'Instruments' | 'Medications' | 'Protective Equipment'
  | 'Impression Materials' | 'Restorative' | 'Sterilization' | 'Equipment'

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired'

export interface InventoryItem {
  id: string
  name: string
  sku?: string
  category: InventoryCategory
  quantity: number
  unit: string
  minStock: number
  maxStock?: number
  price: number
  costPrice?: number
  supplierId?: string
  supplierName?: string
  expiryDate?: string
  location?: string
  notes?: string
  status: StockStatus
  lastRestocked?: string
}

export interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  category?: string
  website?: string
  notes?: string
  status: 'active' | 'inactive'
  totalOrders?: number
  lastOrderDate?: string
  rating?: number
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  date: string
  expectedDelivery?: string
  items: PurchaseOrderItem[]
  total: number
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled'
  notes?: string
}

export interface PurchaseOrderItem {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  total: number
}

export type LabOrderStatus = 'pending' | 'in-progress' | 'ready' | 'delayed' | 'delivered'

export interface LabOrder {
  id: string
  orderNumber: string
  patientName?: string
  status: LabOrderStatus
  dueDate?: string
  createdAt: string
}

// ── Staff / HR ────────────────────────────────────────────────────────────────

export type EmployeeRole = 'doctor' | 'receptionist' | 'nurse' | 'hygienist' | 'assistant' | 'admin' | 'manager'
export type EmployeeStatus = 'active' | 'inactive' | 'on-leave'
export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'full-day' | 'off'

export interface StaffMember {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  role: EmployeeRole
  specialty?: string
  email: string
  phone: string
  avatar?: string
  status: EmployeeStatus
  joinDate: string
  department?: string
  salary?: number
  address?: string
  emergencyContact?: string
  workingDays?: string[]
  shift?: ShiftType
  notes?: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn?: string
  checkOut?: string
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave'
  notes?: string
  /** Populated from backend join when staff list is filtered or not yet loaded */
  staffName?: string
  staffRole?: EmployeeRole
}

// ── Table ─────────────────────────────────────────────────────────────────────

export interface Column<T = Record<string, unknown>> {
  key: keyof T | string
  header: string
  width?: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

// ── API / Pagination ──────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
  message?: string
  success: boolean
}
