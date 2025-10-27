import { db } from '../utils/db.server';
import { TDriverID, TDriverRead, TDriverWrite, TDriverUpdate } from '../types/driver';

// =============================
// 👨‍✈️ List all drivers
// =============================
export const listDrivers = async (): Promise<TDriverRead[]> => {
  const drivers = await db.driver.findMany({
    include: {
      truck: {
        select: {
          id: true,
          truckName: true,
          truckType: true,
          currentStatus: true,
        },
      },
    },
  });

  return drivers.map((d) => ({
    id: d.id,
    name: d.name,
    licenseNo: d.licenseNo,
    email: d.email,
    role: d.role,
    description: d.description,
    phone: d.phone ?? null,
    status: d.status ,
    truckId: d.truckId ,
    truckType: (d as any).truckType,
    truck: d.truck ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  })) as TDriverRead[];
};

// =============================
// 👨‍✈️ Get one driver by ID
// =============================
export const getDriver = async (id: TDriverID): Promise<TDriverRead | null> => {
  const driver = await db.driver.findUnique({
    where: { id },
    include: {
      truck: {
        select: {
          id: true,
          truckName: true,
          truckType: true,
          currentStatus: true,
        },
      },
    },
  });

  if (!driver) return null;

  return {
    id: driver.id,
    name: driver.name,
    licenseNo: driver.licenseNo,
    email: driver.email,
    role: driver.role,
    description: driver.description,
    phone: driver.phone ?? null,
    status: driver.status ,
    truckId: driver.truckId,
    truckType: (driver as any).truckType,
    truck: driver.truck ?? null,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  } as TDriverRead;
};

// =============================
// 👨‍✈️ Create new driver
// =============================
export const createDriver = async (driver: TDriverWrite): Promise<TDriverRead> => {
  const created = await db.driver.create({
    data: {
      name: driver.name,
      licenseNo: driver.licenseNo,
      phone: driver.phone ?? null,
      email: driver.email,
      role: driver.role,
      truckId: driver.truckId,
      description: driver.description,
      truckType: (driver as any).truckType
    } as any,
    include: {
      truck: {
        select: {
          id: true,
          truckName: true,
          truckType: true,
          currentStatus: true,
        },
      },
    },
  }) as any;

  if (driver.truckId) {
    await db.truck.update({
      where: { id: driver.truckId },
      data: { driverId: created.id },
    });
  }

  return {
    id: created.id,
    name: created.name,
    licenseNo: created.licenseNo,
    phone: created.phone ?? null,
    email: created.email,
    role: created.role,
    description: created.description,
    truckType: created.truckType,
    truck: created.truck ?? null,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  } as TDriverRead;
};

// =============================
// 👨‍✈️ Update driver info
// =============================
export const updateDriver = async (driver: TDriverUpdate, id: TDriverID): Promise<TDriverRead> => {
  const updated = await db.driver.update({
    where: { id },
    data: {
      ...driver,
      phone: driver.phone ?? undefined,
    } as any,
    include: {
      truck: {
        select: {
          id: true,
          truckName: true,
          truckType: true,
          currentStatus: true,
        },
      },
    },
  }) as any;

  if (driver.truckId) {
    await db.truck.update({
      where: { id: driver.truckId },
      data: { driverId: id },
    });
  }

  return {
    id: updated.id,
    name: updated.name,
    licenseNo: updated.licenseNo,
    phone: updated.phone ?? null,
    truckType: updated.truckType,
    truck: updated.truck ?? null,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  } as TDriverRead;
};

// =============================
// 🧱 Delete driver
// =============================
export const deleteDriver = async (id: TDriverID) => {
  const driverId = Number(id);
  if (!Number.isInteger(driverId)) {
    throw new Error('INVALID_DRIVER_ID');
  }

  // check existence
  const existing = await db.driver.findUnique({ where: { id: driverId } });
  if (!existing) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  const deleted = await db.driver.delete({
    where: { id: driverId },
  });

    // If the driver is assigned to a truck, make that truck available again
  if (existing.truckId) {
    await db.truck.update({
      where: { id: existing.truckId },
      data: {
        driverId: null,
        currentStatus: 'AVAILABLE', // optional, if you track status
      },
    });
  }

  return deleted;
};