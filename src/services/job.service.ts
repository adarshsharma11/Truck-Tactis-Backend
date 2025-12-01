import { db } from '../utils/db.server';
import { TJobSchema, TJobID } from '../types/job';
import { TruckType } from '@prisma/client';
import { NotificationService } from "./NotificationService";
import type { Driver } from "@prisma/client";

const truckOriginalLat = 34.2035603
const truckOriginalLng = -118.484937
// =============================
// ➕ Create Job with Location & Items
// =============================
export const createJob = async (data: TJobSchema) => {
  let locationId = data.locationId ?? null;
  let dropAddressId = data.dropAddressId ?? null;

  // 🧭 Handle location (same as before)
  if (!locationId && data.location) {
    const loc = data.location;
    const location = await db.location.upsert({
      where: { placeId: loc.placeId ?? `manual-${Date.now()}` },
      update: { ...loc },
      create: {
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
      },
    });
    locationId = location.id;
  }

  if (!dropAddressId && data.dropLocation) {
    const loc = data.dropLocation;
    const location = await db.location.upsert({
      where: { placeId: loc.placeId ?? `manual-${Date.now()}` },
      update: { ...loc },
      create: {
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
      },
    });
    dropAddressId = location.id;
  }

  if (!dropAddressId) {
    dropAddressId = locationId;
  }

  // 🧩 Validate Truck + Driver existence
  let truckId: number | null = null;
  if (data.assignedTruckId) {
    const truckExists = await db.truck.findUnique({
      where: { id: data.assignedTruckId },
    });
    if (truckExists) truckId = truckExists.id;
  }

  let driverId: number | null = null;
  if (data.assignedDriverId) {
    const driverExists = await db.driver.findUnique({
      where: { id: data.assignedDriverId },
    });
    if (driverExists) driverId = driverExists.id;
  }

  if (Array.isArray(data.quantityItem) && data.quantityItem.length > 0) {
    for (const qi of data.quantityItem) {
      const { id, quantity } = qi;
      if (!id || quantity <= 0) continue;
      const existingItem = await db.item.findUnique({ where: { id: id } });
      if (existingItem) {
        // const newQuantity = Math.max((existingItem.quantity ?? 0) - quantity, 0);
        // await db.item.update({
        //   where: { id: id },
        //   data: { quantity: newQuantity },
        // });
      }
    }
  }

  // ✅ Safe create (no invalid foreign keys)
  const job = await db.job.create({
    data: {
      title: data.title,
      actionType: data.actionType,
      locationId,
      notes: data.notes ?? null,
      dropAddressId,
      priority: data.priority ?? 1,
      largeTruckOnly: data.largeTruckOnly ?? false,
      truckType: data.truckType as TruckType,
      curfewFlag: data.curfewFlag ?? false,
      earliestTime: data.earliestTime ? new Date(data.earliestTime) : null,
      latestTime: data.latestTime ? new Date(data.latestTime) : null,
      assignedTruckId: truckId,
      assignedDriverId: driverId,
      isCompleted: data.isCompleted ?? false,
      isFiction: data.isFiction ?? false,
      items: data.items?.length ? { connect: data.items.map((id) => ({ id })) } : undefined,
      date : data.date,
      quantityItem: data.quantityItem || [],
    } as any,
    include: {
      location: true,
      dropAddress: true,
      items: true,
      assignedTruck: { include: { driver: true } },
      assignedDriver: true,
    },
  });

  const managers: Driver[] = await db.driver.findMany({
      where: { role: 'MANAGER' }
  });

  const jobLat = job.location?.latitude ?? null;
  const jobLng = job.location?.longitude ?? null;

  if ( jobLat && jobLng && Math.abs(jobLat - truckOriginalLat) < 0.0001 && Math.abs(jobLng - truckOriginalLng) < 0.0001) {
    let priority = job.priority == 1 ? "High" : "Low"; 
    const itemNames = job.items?.map((item) => item.name || `Item #${item.id}`).join(", ") || "No items";
     await Promise.all(
      managers.map(async (manager) => {
        if (manager.phone) {
          const recipient = `${manager.phone}`;
          try {
            const message =
                "🚛 *New Job Created!*\n\n" +
                `📌 Title: ${job.title}\n` +
                `⚙️ Action Type: ${job.actionType}\n` +
                `🚚 Truck Type: ${job.truckType === "MEDIUM" ? "ANY" : job.truckType}\n` +
                `📍 Location: ${job.location?.address || job.location?.name || "N/A"}\n` +
                `🧱 Items: ${itemNames}\n` +
                `🕒 Earliest Time: ${job.earliestTime ? formatTime(job.earliestTime) : "N/A"}\n` +
                `🕕 Latest Time: ${job.latestTime ? formatTime(job.latestTime) : "N/A"}\n` +
                `⭐ Priority: ${priority}\n` +
                `🗒️ Notes: ${job.notes || "No notes"}`;

            if (manager.smsOptIn) {
              await NotificationService.sendSMS(recipient, message);
            }

            if (manager.whatsappOptIn) {
              await NotificationService.sendWhatsAppJobCreatedTemplate(recipient, {
                manager_name: manager.name || "Manager",
                action_type: job.actionType,
                truck_type: job.truckType === "MEDIUM" ? "ANY" : (job.truckType as any),
                priority: priority,
                job_items: itemNames,
              });
            }
          } catch (err) {
            console.error("❌ Failed to send message:", err);
          }
        }
      })
    );
  }

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
  date?: Date;
}) => {
  const { page = 1, limit = 20, driverId, truckId, isCompleted , date } = params;

  const where: any = {};
  if (driverId) where.assignedDriverId = driverId;
  if (truckId) where.assignedTruckId = truckId;
  where.isCompleted = typeof isCompleted === 'boolean' ? isCompleted : false;
  if (date) {
    // Example: filter jobs created on the same date (ignoring time)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    where.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

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

// =============================
// 🔍 Delete One Job by ID
// =============================

export const deleteJob = async (id: TJobID) => {
   const jobId = Number(id);
  if (!Number.isInteger(jobId)) {
    throw new Error('INVALID_JOB_ID');
  }

  // check existence
  const existing = await db.job.findUnique({ where: { id: jobId } });
  if (!existing) {
    throw new Error('JOB_NOT_FOUND');
  }
  const deleted = await db.job.delete({
    where: { id: jobId },
  });

  return deleted; 
};

// =============================
// 🔍 Complete Job
// =============================

export const completeJob = async (truckId: number) => {
  const updatedJobs = await db.job.updateMany({
    where: {
      assignedTruckId: truckId,
      isCompleted: false,
    },
    data: {
      isCompleted: true,
    },
  });

  const truck = await db.truck.findUnique({
    where: { id: truckId },
  });

  if (truck) {
    await db.truck.update({
      where: { id: truckId },
      data: {currentStatus: 'AVAILABLE' }, 
    });
  }

  return updatedJobs;
};

const formatTime = (time: Date) => {
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


