import { Router } from 'express';
import { addTruck, getTrucks } from '../controllers/truck.controller';

const router = Router();

router.post('/', addTruck);
router.get('/', getTrucks);

export default router;