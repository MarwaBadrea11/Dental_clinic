// ─────────────────────────────────────────────
// Global State — Zustand Store
// SmileFix Patient App
// ─────────────────────────────────────────────
import { create } from 'zustand';

// ── Types ─────────────────────────────────────
export type Locale    = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  email?: string;
  avatarUrl?: string;
  alignersTotal?: number;
  alignersCurrent?: number;
  treatmentStartDate?: string;
  treatmentEndDate?: string;
}

export interface Doctor {
  id: string;
  name: string;
  nameAr: string;
  specialty: string;
  specialtyAr: string;
  rating: number;
  availableDays: number[];
}

export interface Service {
  id: string;
  name: string;
  nameAr: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'waiting' | 'completed' | 'cancelled';
  notes?: string;
  doctor?: Doctor;
  service?: Service;
  createdAt: string;
  isArchived: boolean;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  patient: Patient | null;
  authToken: string | null;

  // Locale & Theme
  locale: Locale;
  theme: ThemeMode;

  // Data
  appointments: Appointment[];
  doctors: Doctor[];
  services: Service[];

  // Booking flow
  bookingStep: number;
  selectedDoctor: Doctor | null;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTimeSlot: string | null;

  // Actions
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAuthenticated: (patient: Patient, token: string) => void;
  logout: () => void;
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  archiveAppointment: (id: string) => void;
  setDoctors: (doctors: Doctor[]) => void;
  setServices: (services: Service[]) => void;
  setBookingStep: (step: number) => void;
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedTimeSlot: (slot: string | null) => void;
  resetBookingFlow: () => void;
  hasConflict: (doctorId: string, date: string, timeSlot: string, excludeId?: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  patient: null,
  authToken: null,
  locale: 'ar',
  theme: 'light',
  appointments: [],
  doctors: [],
  services: [],
  bookingStep: 0,
  selectedDoctor: null,
  selectedService: null,
  selectedDate: null,
  selectedTimeSlot: null,

  setLocale: (locale) => set({ locale }),
  setTheme:  (theme)  => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  // ── Auth ──────────────────────────────────
  // Do NOT call navigation.replace('Main') — let the navigator
  // react to isAuthenticated changing automatically.
  setAuthenticated: (patient, token) =>
    set({ isAuthenticated: true, patient, authToken: token }),

  logout: () =>
    set({
      isAuthenticated: false,
      patient: null,
      authToken: null,
      appointments: [],
    }),

  setAppointments: (appointments) => set({ appointments }),

  addAppointment: (appointment) =>
    set((s) => ({ appointments: [appointment, ...s.appointments] })),

  archiveAppointment: (id) =>
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, isArchived: true, status: 'cancelled' } : a
      ),
    })),

  setDoctors:  (doctors)  => set({ doctors }),
  setServices: (services) => set({ services }),
  setBookingStep: (step)  => set({ bookingStep: step }),
  setSelectedDoctor:   (d) => set({ selectedDoctor: d }),
  setSelectedService:  (s) => set({ selectedService: s }),
  setSelectedDate:     (d) => set({ selectedDate: d }),
  setSelectedTimeSlot: (s) => set({ selectedTimeSlot: s }),

  resetBookingFlow: () =>
    set({
      bookingStep: 0,
      selectedDoctor: null,
      selectedService: null,
      selectedDate: null,
      selectedTimeSlot: null,
    }),

  hasConflict: (doctorId, date, timeSlot, excludeId) => {
    const { appointments } = get();
    return appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.doctorId === doctorId &&
        a.date === date &&
        a.timeSlot === timeSlot &&
        a.status !== 'cancelled' &&
        !a.isArchived
    );
  },
}));
