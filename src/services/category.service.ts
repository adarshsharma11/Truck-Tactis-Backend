import { db } from '../utils/db.server';
import { TCategorySchema, TCategoryID, TCategoryUpdate } from '../types/category';

export const createCategory = async (data: TCategorySchema) => {
  return db.itemCategory.create({ data });
};

export const getCategories = async () => {
  return db.itemCategory.findMany({ orderBy: { id: 'desc' } });
};

export const getCategoryById = async (id: TCategoryID) => {
  return db.itemCategory.findUnique({ where: { id } });
};

export const updateCategory = async (id: TCategoryID, data: TCategoryUpdate) => {
  return db.itemCategory.update({ where: { id }, data });
};

export const deleteCategory = async (id: TCategoryID) => {
  return db.itemCategory.delete({ where: { id } });
};

export const getSubCategories = async (id: TCategoryID) => {
  return db.itemCategory.findMany({ where: { parentId: id } as any });
};