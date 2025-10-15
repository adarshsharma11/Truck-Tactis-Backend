import { db } from '../utils/db.server';
import { TItemSchema, TItemID, TItemUpdate } from '../types/item';

export const createItem = async (data: TItemSchema) => {
  return db.item.create({ data, include: { category: true } });
};

export const listItems = async (categoryId?: number) => {
  const where = categoryId ? { categoryId } : {};
  return db.item.findMany({ 
    where, 
    include: { category: true }, 
    orderBy: { id: 'desc' } 
  });
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

  return categories;
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
