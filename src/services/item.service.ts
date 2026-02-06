import { db } from '../utils/db.server';
import { TItemSchema, TItemID, TItemUpdate } from '../types/item';

export const createItem = async (data: TItemSchema) => {
  return db.item.create({ data, include: { category: true } });
};

// List items grouped under categories (hierarchy)
export const listItems = async (categoryId?: number) => {
  // Fetch all categories and their items
  const allCategories = await db.itemCategory.findMany({
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  }) as any[];

  // Map for lookup
  const categoryMap: Record<number, any> = {};
  allCategories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  // Build hierarchy
  const rootCategories: any[] = [];
  allCategories.forEach((cat) => {
    if (cat.parentId) {
      const parent = categoryMap[cat.parentId];
      if (parent) parent.children.push(categoryMap[cat.id]);
    } else {
      rootCategories.push(categoryMap[cat.id]);
    }
  });

  // If categoryId is given, return only that subtree
  if (categoryId) {
    return categoryMap[categoryId] ? [categoryMap[categoryId]] : [];
  }

  return rootCategories;
};

export const listCategoriesWithItems = async () => {
  const categories = await db.itemCategory.findMany({
    include: {
      items: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  }) as any[];

  const categoryMap: Record<number, any> = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  const rootCategories: any[] = [];
  categories.forEach((cat) => {
    if (cat.parentId) {
      const parent = categoryMap[cat.parentId];
      if (parent) parent.children.push(categoryMap[cat.id]);
    } else {
      rootCategories.push(categoryMap[cat.id]);
    }
  });

  return rootCategories;
};

export const getItem = async (id: TItemID) => {
  return db.item.findUnique({ where: { id }, include: { category: true } });
};

export const updateItem = async (id: TItemID, data: TItemUpdate) => {
  return db.item.update({ where: { id }, data, include: { category: true } });
};

export const deleteItem = async (id: TItemID) => {
  await db.item.delete({ where: { id } });
};

export const getTrackedItemLocations = async () => {
  const trackedItems = await db.item.findMany({
    where: { trackAsMachine: true },
  });

  const allCompletedJobs = await db.job.findMany({
    // where: { isCompleted: true },
    include: { location: true, items: true },
    orderBy: { date: 'asc' }
  });

  // itemId -> locationId -> quantity
  type LocationInfo = {
    quantity: number;
    siteName: string;
    address: string;
    lat: number;
    lng: number;
    jobId: number;
    jobTitle: string;
    actionType: string;
    date: Date;
  };

  const currentStatus: Record<number, Record<number, LocationInfo>> = {};

  const WAREHOUSE_LAT = 34.2035603;
  const WAREHOUSE_LNG = -118.484937;

  // Initialize Warehouse Stock
  for (const item of trackedItems) {
    if (!currentStatus[item.id]) currentStatus[item.id] = {};
    currentStatus[item.id][0] = {
      quantity: item.quantity,
      siteName: "Warehouse",
      address: "Main Warehouse",
      lat: WAREHOUSE_LAT,
      lng: WAREHOUSE_LNG,
      jobId: 0,
      jobTitle: "Initial Stock",
      actionType: "STOCK",
      date: item.createdAt
    };
  }

  // Replay Jobs
  for (const job of allCompletedJobs) {
    if (!job.location) continue;
    const locationId = job.locationId || -1;

    const jobItems = new Map<number, number>();

    // From relation
    for (const item of job.items) {
      if (item.trackAsMachine) {
        jobItems.set(item.id, (jobItems.get(item.id) || 0) + 1);
      }
    }

    // From quantityItem JSON
    if (Array.isArray(job.quantityItem)) {
      for (const qi of job.quantityItem as any[]) {
        const item = trackedItems.find(t => t.id === qi.id);
        if (item) {
          // Assume quantityItem overrides or adds to relation. 
          // Using strict assignment if present in JSON might be safer, but let's accumulate for now
          // to match common "add items" UI patterns.
          // However, usually `quantityItem` is the definitive source for quantity.
          // Let's set it if found.
          jobItems.set(qi.id, qi.quantity);
        }
      }
    }

    for (const [itemId, qty] of jobItems.entries()) {
      if (!currentStatus[itemId]) continue;

      if (job.actionType === 'PICKUP') {
        // Move from Warehouse to Job Location
        if (currentStatus[itemId][0]) {
          currentStatus[itemId][0].quantity -= qty;
          if (currentStatus[itemId][0].quantity < 0) currentStatus[itemId][0].quantity = 0;
        }

        if (!currentStatus[itemId][locationId]) {
          currentStatus[itemId][locationId] = {
            quantity: 0,
            siteName: job.location.name,
            address: job.location.address,
            lat: job.location.latitude,
            lng: job.location.longitude,
            jobId: job.id,
            jobTitle: job.title,
            actionType: job.actionType,
            date: job.date || job.updatedAt
          };
        }
        currentStatus[itemId][locationId].quantity += qty;
        // Update metadata (reflect pickup location and job)
        currentStatus[itemId][locationId].jobId = job.id;
        currentStatus[itemId][locationId].jobTitle = job.title;
        currentStatus[itemId][locationId].actionType = job.actionType;
        currentStatus[itemId][locationId].date = job.date || job.updatedAt;

      } else if (job.actionType === 'DROPOFF') {
        // Move from Job Location to Warehouse
        if (currentStatus[itemId][locationId]) {
          currentStatus[itemId][locationId].quantity -= qty;
          if (currentStatus[itemId][locationId].quantity <= 0) {
            delete currentStatus[itemId][locationId];
          }
        }

        if (currentStatus[itemId][0]) {
          currentStatus[itemId][0].quantity += qty;
          // Update warehouse metadata to reflect latest dropoff job
          currentStatus[itemId][0].jobId = job.id;
          currentStatus[itemId][0].jobTitle = job.title;
          currentStatus[itemId][0].actionType = job.actionType;
          currentStatus[itemId][0].date = job.date || job.updatedAt;
        }
      }
    }
  }

  const result: any[] = [];
  for (const itemIdStr in currentStatus) {
    const itemId = Number(itemIdStr);
    const itemDef = trackedItems.find(t => t.id === itemId);
    if (!itemDef) continue;

    const locations = currentStatus[itemId];
    for (const locIdStr in locations) {
      const loc = locations[locIdStr];
      if (loc.quantity > 0) {
        result.push({
          id: itemId,
          name: itemDef.name,
          quantity: loc.quantity,
          lastLocation: {
            siteName: loc.siteName,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            jobId: loc.jobId,
            jobTitle: loc.jobTitle,
            actionType: loc.actionType,
            date: loc.date.toISOString()
          }
        });
      }
    }
  }

  return result;
};
