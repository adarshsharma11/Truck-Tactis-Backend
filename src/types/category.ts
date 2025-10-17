import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
});

export const categoryUpdateSchema = categorySchema.partial();

export type TCategorySchema = z.infer<typeof categorySchema>;
export type TCategoryID = number;
export type TCategoryUpdate = Partial<TCategorySchema>;