import { TruckType } from '@prisma/client';
import { z } from 'zod';

export const itemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().nullable().optional(),
  weightLbs: z.number().nullable().optional(),
  lengthIn: z.number().nullable().optional(),
  widthIn: z.number().nullable().optional(),
  heightIn: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  requiresLargeTruck: z.boolean().default(false),
  truckType:z.nativeEnum(TruckType, { required_error: 'Truck type is required' }),
  categoryId: z.number().nullable().optional(),
});

export const itemUpdateSchema = itemSchema.partial();

export type TItemSchema = z.infer<typeof itemSchema>;
export type TItemID = number;
export type TItemUpdate = Partial<TItemSchema>;
