import { TruckType } from '@prisma/client';
import { z } from 'zod';

// =============================
// 👨‍✈️ Validation Schema (Zod)
// =============================
export const driverSchema = z.object({
  name: z.string().min(2, 'Driver name is required'),
  licenseNo: z.string().min(5, 'License number is required'),
  phone: z.string().nullable().optional(),
  truckType: z.nativeEnum(TruckType, { required_error: 'Truck type is required' })
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
  truckType : TruckType
  truck: TDriverTruck;
  createdAt: Date;
  updatedAt: Date;
};

// ✅ Types for service layer
export type TDriverWrite = TDriverSchema;
export type TDriverUpdate = Partial<TDriverSchema>;