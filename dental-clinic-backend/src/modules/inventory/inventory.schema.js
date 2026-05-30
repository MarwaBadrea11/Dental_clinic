import { z } from 'zod';

const INVENTORY_CATEGORIES = [
  'Consumables', 'Instruments', 'Medications', 'Protective Equipment',
  'Impression Materials', 'Restorative', 'Sterilization', 'Equipment',
];

export const CreateInventorySchema = z.object({
  material_name: z.string().min(1, 'Material name is required'),
  category: z.enum(INVENTORY_CATEGORIES),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().min(1).default('piece'),
  min_stock_alert: z.number().int().min(0).default(5),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable(),
  unit_price: z.number().min(0).default(0),
  supplier_info: z.string().optional().nullable(),
});

export const UpdateInventorySchema = CreateInventorySchema.partial();

export const RestockInventorySchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});
