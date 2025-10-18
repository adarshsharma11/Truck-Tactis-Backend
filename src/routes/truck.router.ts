import { Router } from 'express';
import { addTruck, getTrucks, deleteTruck } from '../controllers/truck.controller';

const router = Router();

router.post('/', addTruck);
router.get('/', getTrucks);
router.delete('/:id', deleteTruck);


export default router;