import { db } from '../utils/db.server';
import { TJobSchema, TJobID } from '../types/job';
import { TruckType } from '@prisma/client';
import { NotificationService } from "./NotificationService";

const truckOriginalLat = 34.2035603
const truckOriginalLng = -118.484937
// =============================
// ➕ Create Job with Location & Items
// =============================
export const createJob = async (data: TJobSchema) => {
  let locationId = data.locationId ?? null;

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
      items: true,
      assignedTruck: { include: { driver: true } },
      assignedDriver: true,
    },
  });

  const managers = await db.driver.findMany({
      where: { role: 'MANAGER' },
      select: { phone: true }
  });

  const jobLat = job.location?.latitude ?? null;
  const jobLng = job.location?.longitude ?? null;

  if ( jobLat && jobLng && Math.abs(jobLat - truckOriginalLat) < 0.0001 && Math.abs(jobLng - truckOriginalLng) < 0.0001) {
    let priority = job.priority == 1 ? "High" : "Low"; 
    const itemNames = job.items?.map((item) => item.name || `Item #${item.id}`).join(", ") || "No items";
    const message =
    `🚛 *New Job Created!*\n\n` +
    `📌 *Title:* ${job.title}\n` +
    `⚙️ *Action Type:* ${job.actionType}\n` +
    `🚚 *Truck Type:* ${job.truckType== "MEDIUM"?"ANY":job.truckType}\n` +
    `📍 *Location:* ${job.location?.address || job.location?.name || "N/A"}\n` +
    `🧱 *Items:* ${itemNames}\n` +
    `🕒 *Earliest Time:* ${formatTime(job.earliestTime)}\n` +
    `🕕 *Latest Time:* ${formatTime(job.latestTime)}\n` +
    `⭐ *Priority:* ${priority}\n` +
    `🗒️ *Notes:* ${job.notes || "No notes"}`;

     await Promise.all(
      managers.map(async (manager) => {
        if (manager.phone) {
          const recipient = `${manager.phone}`; // format for Twilio WhatsApp
          try {
          await NotificationService.sendWhatsApp(recipient, message);
          } catch (err) {
            console.error("❌ Failed to send WhatsApp message:", err);
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


function formatTime(date?: Date | string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


