import { Router } from 'express';
import { addItem, getItems, getCategoriesWithItems } from '../controllers/item.controller';

const router = Router();

router.post('/', addItem);
router.get('/', getItems);
router.get("/categoriesWithItems", getCategoriesWithItems);

export default router;