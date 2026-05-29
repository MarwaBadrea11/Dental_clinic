import { z } from 'zod';

const VALID_TOOTH_STATUSES = ['HEALTHY', 'DECAYED', 'FILLED', 'MISSING', 'CROWNED', 'IMPLANT', 'BRIDGE'];

// FDI notation: quadrants 1-4, positions 1-8 → e.g. "11","18","21","48"
const FDI_TEETH = [];
for (const quadrant of [1, 2, 3, 4]) {
  for (const position of [1, 2, 3, 4, 5, 6, 7, 8]) {
    FDI_TEETH.push(`${quadrant}${position}`);
  }
}

export const UpdateToothSchema = z.object({
  status: z.enum(VALID_TOOTH_STATUSES),
  notes: z.string().optional().nullable(),
  surfaces: z.array(z.enum(['M', 'D', 'O', 'B', 'L', 'I'])).optional().default([]),
  treatment_plan_id: z.string().uuid().optional().nullable(),
});

export const VALID_FDI_TEETH = FDI_TEETH;
