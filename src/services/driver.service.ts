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
    smsOptIn: (d as any).smsOptIn ?? true,
    whatsappOptIn: (d as any).whatsappOptIn ?? true,
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
    smsOptIn: (driver as any).smsOptIn ?? true,
    whatsappOptIn: (driver as any).whatsappOptIn ?? true,
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
      truckType: (driver as any).truckType,
      smsOptIn: (driver as any).smsOptIn ?? true,
      whatsappOptIn: (driver as any).whatsappOptIn ?? true,
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
    smsOptIn: (created as any).smsOptIn ?? true,
    whatsappOptIn: (created as any).whatsappOptIn ?? true,
    truck: created.truck ?? null,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  } as TDriverRead;
};

// =============================
// 👨‍✈️ Update driver info
// =============================
export const updateDriver = async (driver: TDriverUpdate, id: TDriverID): Promise<TDriverRead> => {
  // Get existing driver to check current role
  const existingDriver = await db.driver.findUnique({
    where: { id },
    include: { truck: true },
  });

  if (!existingDriver) {
    throw new Error('DRIVER_NOT_FOUND');
  }

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

  // If role is not DRIVER, delete truck data (clear truck association)
  // This should happen BEFORE trying to assign a new truck
  if (driver.role && driver.role !== 'DRIVER') {
    // If driver had a truck, clear the truck association
    if (existingDriver.truckId) {
      await db.truck.update({
        where: { id: existingDriver.truckId },
        data: {
          driverId: null,
          currentStatus: 'AVAILABLE',
        },
      });
    }
    // Clear driver's truckId (ignore any new truckId being assigned)
    await db.driver.update({
      where: { id },
      data: { truckId: null },
    });
  } else if (driver.truckId !== undefined) {
    // Role is DRIVER (or not changed), allow truck assignment/change
    
    // If driver already has a truck, clear it first
    if (existingDriver.truckId) {
      await db.truck.update({
        where: { id: existingDriver.truckId },
        data: { driverId: null, currentStatus: 'AVAILABLE' },
      });
    }
    
    // If assigning to a new/different truck, clear the previous driver of that truck if any
    if (driver.truckId !== null) {
      const existingTruck = await db.truck.findUnique({
        where: { id: driver.truckId },
        select: { driverId: true },
      });
      
      if (existingTruck?.driverId && existingTruck.driverId !== id) {
        // Clear the previous driver's truck association
        await db.driver.update({
          where: { id: existingTruck.driverId },
          data: { truckId: null },
        });
      }
      
      // Now assign the new truck to this driver
      await db.truck.update({
        where: { id: driver.truckId },
        data: { driverId: id },
      });
    }
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