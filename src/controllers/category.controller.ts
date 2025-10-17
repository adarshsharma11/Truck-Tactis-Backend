import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { categorySchema } from '../types/category';

export const createCategory = async (req: Request, res: Response) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const category = await categoryService.createCategory(parsed);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCategories = async (_: Request, res: Response) => {
  try {
    const categories = await categoryService.getCategories();

    if (!categories || categories.length === 0) {
      res.status(404).json({ success: false, message: 'No categories found' });
    }
    const categoryMap: Record<number, any> = {};
    const rootCategories: any[] = [];

    categories.forEach((cat: any) => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    categories.forEach((cat: any) => {
      if (cat.parentId) {
        categoryMap[cat.parentId]?.children.push(categoryMap[cat.id]);
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });
    res.json({ success: true, data: rootCategories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const category = await categoryService.getCategoryById(id);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const category = await categoryService.updateCategory(id, req.body);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await categoryService.deleteCategory(id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};