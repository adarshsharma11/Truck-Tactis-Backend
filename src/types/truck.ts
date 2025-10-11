import { z } from 'zod';
import { TruckType, TruckStatus } from '@prisma/client';

// =============================
// 🚚 Validation Schema (Zod)
// =============================
export const truckSchema = z.object({
  truckName: z.string().min(2, 'Truck name is required'),
  capacityCuFt: z.number().positive('Capacity must be positive'),
  maxWeightLbs: z.number().positive('Max weight must be positive'),
  lengthFt: z.number().positive('Length must be positive'),
  widthFt: z.number().positive('Width must be positive'),
  heightFt: z.number().positive('Height must be positive'),
  truckType: z.nativeEnum(TruckType, { required_error: 'Truck type is required' }),
  color: z.string().nullable().optional(),
  yearOfManufacture: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  currentStatus: z.nativeEnum(TruckStatus).default(TruckStatus.AVAILABLE),
  restrictedLoadTypes: z.array(z.string()).nullable().optional(),
  gpsEnabled: z.boolean().default(true),
  lastKnownLat: z.number().nullable().optional(),
  lastKnownLng: z.number().nullable().optional(),
  driverId: z.number().nullable().optional(),
});

// For partial updates (PUT/PATCH)
export const truckUpdateSchema = truckSchema.partial();

// =============================
// 🧩 Type Definitions
// =============================
export type TTruckSchema = z.infer<typeof truckSchema>;
export type TTruckID = number;

export type TTruckDriver = {
  id: number;
  name: string;
  licenseNo: string;
  phone: string | null;
} | null;

export type TTruckRead = {
  id: number;
  truckName: string;
  capacityCuFt: number;
  maxWeightLbs: number;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  truckType: TruckType;
  color: string | null;
  yearOfManufacture: number | null;
  isActive: boolean;
  currentStatus: TruckStatus;
  restrictedLoadTypes: string[] | null;
  gpsEnabled: boolean;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  driverId: number | null;
  driver: TTruckDriver;
  createdAt: Date;
  updatedAt: Date;
};

// ✅ Types for service layer
export type TTruckWrite = TTruckSchema;
export type TTruckUpdate = Partial<TTruckSchema>;
