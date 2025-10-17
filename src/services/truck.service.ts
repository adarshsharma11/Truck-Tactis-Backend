import { db } from '../utils/db.server';
import { TruckStatus } from '@prisma/client';
import { TTruckID, TTruckRead, TTruckWrite, TTruckUpdate } from '../types/truck';

// =============================
// 🚛 List all trucks
// =============================
export const listTrucks = async (): Promise<TTruckRead[]> => {
  const trucks = await db.truck.findMany({
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  });

  return trucks.map((t) => ({
    ...t,
    color: t.color ?? null,
    yearOfManufacture: t.yearOfManufacture ?? null,
    restrictedLoadTypes: (t.restrictedLoadTypes as string[] | null) ?? null,
    lastKnownLat: t.lastKnownLat ?? null,
    lastKnownLng: t.lastKnownLng ?? null,
    driver: t.driver ?? null,
  }));
};

// =============================
// 🚛 Get one truck by ID
// =============================
export const getTruck = async (id: TTruckID): Promise<TTruckRead | null> => {
  const truck = await db.truck.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  });

  if (!truck) return null;

  return {
    ...truck,
    color: truck.color ?? null,
    yearOfManufacture: truck.yearOfManufacture ?? null,
    restrictedLoadTypes: (truck.restrictedLoadTypes as string[] | null) ?? null,
    lastKnownLat: truck.lastKnownLat ?? null,
    lastKnownLng: truck.lastKnownLng ?? null,
    driver: truck.driver ?? null,
  };
};

// =============================
// 🚚 Create new truck
// =============================
export const createTruck = async (truck: TTruckWrite): Promise<TTruckRead> => {
  const created = await db.truck.create({
    data: {
      truckName: truck.truckName,
      capacityCuFt: truck.capacityCuFt,
      maxWeightLbs: truck.maxWeightLbs,
      lengthFt: truck.lengthFt,
      widthFt: truck.widthFt,
      heightFt: truck.heightFt,
      truckType: truck.truckType,
      color: truck.color ?? null,
      yearOfManufacture: truck.yearOfManufacture ?? null,
      isActive: truck.isActive ?? true,
      currentStatus: truck.currentStatus ?? TruckStatus.AVAILABLE,
      restrictedLoadTypes: truck.restrictedLoadTypes ?? [],
      gpsEnabled: truck.gpsEnabled ?? true,
      lastKnownLat: truck.lastKnownLat ?? null,
      lastKnownLng: truck.lastKnownLng ?? null,
      driverId: truck.driverId ?? null,
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  });

  return {
    ...created,
    restrictedLoadTypes: (created.restrictedLoadTypes as string[] | null) ?? null,
  };
};

// =============================
// 🧰 Update truck info
// =============================
export const updateTruck = async (truck: TTruckUpdate, id: TTruckID): Promise<TTruckRead> => {
  const updated = await db.truck.update({
    where: { id },
    data: {
      ...truck,
      restrictedLoadTypes: truck.restrictedLoadTypes ?? undefined,
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  });

  return {
    ...updated,
    restrictedLoadTypes: (updated.restrictedLoadTypes as string[] | null) ?? null,
  };
};

// =============================
// ⚙️ Update truck status
// =============================
export const updateTruckStatus = async (
  id: TTruckID,
  status: TruckStatus
): Promise<TTruckRead> => {
  return db.truck.update({
    where: { id },
    data: { currentStatus: status },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  }) as unknown as TTruckRead;
};

// =============================
// 🔄 Toggle active/inactive
// =============================
export const updateTruckActiveState = async (
  id: TTruckID,
  isActive: boolean
): Promise<TTruckRead> => {
  return db.truck.update({
    where: { id },
    data: { isActive },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          licenseNo: true,
          phone: true,
        },
      },
    },
  }) as unknown as TTruckRead;
};

// =============================
// 🧱 Delete truck
// =============================
export const deleteTruck = async (id: TTruckID) => {
   const truckId = Number(id);
  if (!Number.isInteger(truckId)) {
    throw new Error('INVALID_TRUCK_ID');
  }

  // check existence
  const existing = await db.truck.findUnique({ where: { id: truckId } });
  if (!existing) {
    throw new Error('TRUCK_NOT_FOUND');
  }
  const deleted = await db.truck.delete({
    where: { id: truckId },
  });

  return deleted; 
};