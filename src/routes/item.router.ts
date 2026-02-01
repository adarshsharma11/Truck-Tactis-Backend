import { Router } from 'express';
import { addItem, getItems, getCategoriesWithItems, deleteItem, updateItem, getTrackedItemsLocations } from '../controllers/item.controller';

const router = Router();

router.post('/', addItem);
router.get('/', getItems);
router.get('/tracked', getTrackedItemsLocations);
router.delete('/:id', deleteItem);
router.put('/:id', updateItem);

router.get("/categoriesWithItems", getCategoriesWithItems);

export default router;