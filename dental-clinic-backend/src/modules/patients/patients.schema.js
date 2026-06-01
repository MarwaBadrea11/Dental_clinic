import { z } from 'zod';

export const CreatePatientSchema = z.object({

  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in format YYYY-MM-DD'),
  gender: z.enum(['male', 'female', 'other']),
  national_id: z.string().min(1, "National ID is required"),
  
  
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).optional().default('active'),

  
  blood_type: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  medical_history: z.string().optional().nullable(),
  clinical_notes: z.string().optional().nullable(), 

  
  insurance_provider: z.string().optional().nullable(), 
  insurance_policy_number: z.string().optional().nullable(), 

  
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_relationship: z.string().optional().nullable(), 
  emergency_contact_phone: z.string().optional().nullable(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial().extend({
  
  id: z.never().optional(),
});