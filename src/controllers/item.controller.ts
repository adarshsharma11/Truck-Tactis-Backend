import { Request, Response } from 'express';
import * as ItemService from '../services/item.service';
import { itemSchema } from '../types/item';

export const addItem = async (req: Request, res: Response) => {
  try {
    const parsed = itemSchema.parse(req.body);
    const item = await ItemService.createItem(parsed);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getItems = async (req: Request, res: Response) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const items = await ItemService.listItems(categoryId);
  res.json({ success: true, data: items });
};

export const getItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await ItemService.getItem(id);
  res.json({ success: true, data: item });
};

export const updateItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updated = await ItemService.updateItem(id, req.body);
  res.json({ success: true, data: updated });
};

export const deleteItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await ItemService.deleteItem(id);
  res.json({ success: true, message: 'Item deleted successfully' });
};
