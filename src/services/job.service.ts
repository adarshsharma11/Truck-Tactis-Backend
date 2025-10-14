import { db } from '../utils/db.server';
import { TJobSchema, TJobID, TJobUpdate } from '../types/job';

// =============================
// ➕ Create Job with Location & Items
// =============================
export const createJob = async (data: TJobSchema) => {
  let locationId = data.locationId ?? null;

  if (!locationId && data.location) {
    const loc = data.location;
    let location = loc.placeId
      ? await db.location.findUnique({ where: { placeId: loc.placeId } })
      : null;

    if (!location) {
      location = await db.location.create({
        data: {
          placeId: loc.placeId ?? `manual-${Date.now()}`,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city ?? null,
          state: loc.state ?? null,
          country: loc.country ?? null,
          postalCode: loc.postalCode ?? null,
          isSaved: loc.isSaved ?? false,
          createdById: loc.createdById ?? null,
        },
      });
    }

    locationId = location.id;
  }

  const job = await db.job.create({
    data: {
      title: data.title,
      actionType: data.actionType,
      locationId,
      notes: data.notes ?? null,
      priority: data.priority ?? 1,
      largeTruckOnly: data.largeTruckOnly ?? false,
      curfewFlag: data.curfewFlag ?? false,
      assignedTruckId: data.assignedTruckId ?? null,
      assignedDriverId: data.assignedDriverId ?? null,
      isCompleted: data.isCompleted ?? false,
      isFiction: data.isFiction ?? false,
      items: data.items?.length ? { connect: data.items.map((id) => ({ id })) } : undefined,
    },
    include: {
      location: true,
      items: true,
      assignedTruck: { include: { driver: true } },
      assignedDriver: true,
    },
  });

  return job;
};

// =============================
// 📋 List Jobs (with filters + pagination)
// =============================
export const listJobs = async (params: {
  page?: number;
  limit?: number;
  driverId?: number;
  truckId?: number;
  isCompleted?: boolean;
}) => {
  const { page = 1, limit = 20, driverId, truckId, isCompleted } = params;

  const where: any = {};
  if (driverId) where.assignedDriverId = driverId;
  if (truckId) where.assignedTruckId = truckId;
  if (typeof isCompleted === 'boolean') where.isCompleted = isCompleted;

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        location: true,
        items: true,
        assignedTruck: { include: { driver: true } },
        assignedDriver: true,
      },
    }),
    db.job.count({ where }),
  ]);

  return { total, page, limit, jobs };
};

// =============================
// 🔍 Get One Job by ID
// =============================
export const getJob = async (id: TJobID) => {
  return db.job.findUnique({
    where: { id },
    include: {
      location: true,
      items: true,
      assignedTruck: { include: { driver: true } },
      assignedDriver: true,
    },
  });
};
