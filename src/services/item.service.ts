import { db } from '../utils/db.server';
import { TItemSchema, TItemID, TItemUpdate } from '../types/item';

export const createItem = async (data: TItemSchema) => {
  return db.item.create({ data, include: { category: true } });
};

// List items grouped under categories (hierarchy)
export const listItems = async () => {
  // Fetch all categories with their items
  const categories = await db.itemCategory.findMany({
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Map for easy lookup
  const categoryMap: Record<number, any> = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  // Build hierarchy
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

export const listCategoriesWithItems = async () => {
  const categories = await db.itemCategory.findMany({
    include: {
      items: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

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
