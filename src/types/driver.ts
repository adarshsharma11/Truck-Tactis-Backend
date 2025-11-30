import { ContactRole, TruckType } from '@prisma/client';
import { z } from 'zod';

// =============================
// 👨‍✈️ Validation Schema (Zod)
// =============================
export const driverSchema = z.object({
  name: z.string().min(2, 'Driver name is required'),
  licenseNo: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  role : z.nativeEnum(ContactRole,{ required_error: 'Role is required' }),
  description: z.string().nullable(),
  truckId : z.number().nullable(),
  truckType: z.nativeEnum(TruckType, { required_error: 'Truck type is required' }),
  smsOptIn: z.boolean().default(true),
  whatsappOptIn: z.boolean().default(true)
});

// For partial updates (PUT/PATCH)
export const driverUpdateSchema = driverSchema.partial();

// =============================
// 🧩 Type Definitions
// =============================
export type TDriverSchema = z.infer<typeof driverSchema>;
export type TDriverID = number;

export type TDriverTruck = {
  id: number;
  truckName: string;
  truckType: string;
  currentStatus: string;
} | null;

export type TDriverRead = {
  id: number;
  name: string;
  licenseNo: string;
  phone: string | null;
  email: string | null,
  role: string | null,
  description: string | null,
  status : string;
  truckId : number | null;
  truckType : TruckType
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  truck: TDriverTruck;
  createdAt: Date;
  updatedAt: Date;
};

// ✅ Types for service layer
export type TDriverWrite = TDriverSchema;
export type TDriverUpdate = Partial<TDriverSchema>;