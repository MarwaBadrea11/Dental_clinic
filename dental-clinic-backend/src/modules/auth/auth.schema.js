import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const RegisterSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  // PATIENT is the role used by the mobile self-registration flow.
  // Staff roles are assigned by admins via the clinic admin panel.
  role: z.enum(['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'STOREKEEPER', 'HR', 'PATIENT']),
  // Optional patient fields — only used when role = 'PATIENT'
  phone:         z.string().optional(),
  national_id:   z.string().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  gender:        z.enum(['male', 'female', 'other']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const UpdateProfileSchema = z.object({
  username: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
});
