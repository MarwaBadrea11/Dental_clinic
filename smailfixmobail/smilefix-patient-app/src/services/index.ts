// ─────────────────────────────────────────────
// Services — barrel export
// Usage: import { api, login, createAppointment } from '../services';
// ─────────────────────────────────────────────

export { api, apiRequest, ApiRequestError } from './api';
export type { ApiSuccess, ApiError, ApiResponse } from './api';

export { saveSession, saveAccessToken, loadSession, clearSession } from './storage';
export type { PersistedSession } from './storage';

export { login, register, refreshTokens, logout } from './authService';
export type {
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  AuthUser,
  LoginResponse,
  RegisterResponse,
} from './authService';

export {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment,
  toScheduledAt,
} from './appointmentService';
export type {
  AppointmentStatus,
  BackendAppointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  ListAppointmentsParams,
  AppointmentsListResponse,
} from './appointmentService';

export { fetchDentists } from './dentistService';
export type { BackendDentist } from './dentistService';

export { fetchProcedures } from './procedureService';
export type { BackendProcedure, ProcedureListResponse } from './procedureService';

export { fetchMyPatient, adaptPatient } from './patientService';
export type { BackendPatient } from './patientService';
