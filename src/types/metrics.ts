import { z } from 'zod';

// =============================
// 🧾 Validation Schema (Zod)
// =============================
export const metricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  truckId: z.number().optional(),
  driverId: z.number().optional(),
});

// =============================
// 🧩 Type Definitions
// =============================
export type TMetricsQuery = z.infer<typeof metricsQuerySchema>;

export interface TMetricsResponse {
  date_range: {
    from: string;
    to: string;
  };
  jobs_completed: number;
  jobs_deferred: number;
  on_time_percentage: number;
  avg_service_time_minutes: number;
  utilization_by_truck: TTruckUtilization[];
}

export interface TTruckUtilization {
  truck_name: string;
  utilization: number;
}

export interface TJobsTrend {
  day: string;
  completed: number;
  deferred: number;
}