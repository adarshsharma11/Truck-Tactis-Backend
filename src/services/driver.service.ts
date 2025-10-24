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
    ...d,
    phone: d.phone ?? null,
    truck: d.truck ?? null,
  }));
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
    ...driver,
    phone: driver.phone ?? null,
    truck: driver.truck ?? null,
  };
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
      truckType : driver.truckType
    },
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

  return {
    ...created,
    phone: created.phone ?? null,
    truck: created.truck ?? null,
  };
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
    },
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

  return {
    ...updated,
    phone: updated.phone ?? null,
    truck: updated.truck ?? null,
  };
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

  return deleted;
};