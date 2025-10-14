import { z } from 'zod';
import { ActionType } from '@prisma/client';

// =============================
// 🧾 Validation Schema (Zod)
// =============================
export const jobSchema = z.object({
  title: z.string().min(2, 'Job title is required'),
  actionType: z.nativeEnum(ActionType, { required_error: 'Action type is required' }),
  locationId: z.number().optional(),
  location: z
    .object({
      placeId: z.string().optional(),
      name: z.string(),
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      isSaved: z.boolean().optional(),
      createdById: z.string().optional(),
    })
    .optional(),
  priority: z.number().int().min(1).default(1),
  notes: z.string().nullable().optional(),
  largeTruckOnly: z.boolean().default(false),
  curfewFlag: z.boolean().default(false),
  assignedTruckId: z.number().nullable().optional(),
  assignedDriverId: z.number().nullable().optional(),
  isCompleted: z.boolean().default(false),
  isFiction: z.boolean().default(false),
  items: z.array(z.number().int()).optional(),
});

export const jobUpdateSchema = jobSchema.partial();

// =============================
// 🧩 Type Definitions
// =============================
export type TJobSchema = z.infer<typeof jobSchema>;
export type TJobUpdate = z.infer<typeof jobUpdateSchema>;
export type TJobID = number;
