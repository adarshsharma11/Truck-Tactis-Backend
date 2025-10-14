import { Router } from 'express';
import { addItem, getItems } from '../controllers/item.controller';

const router = Router();

router.post('/', addItem);
router.get('/', getItems);

export default router;