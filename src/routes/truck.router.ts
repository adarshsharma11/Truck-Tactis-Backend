import { Router } from 'express';
import { addTruck, getTrucks, updateTruck, deleteTruck } from '../controllers/truck.controller';

const router = Router();

router.post('/', addTruck);
router.get('/', getTrucks);
router.put('/:id', updateTruck);
router.delete('/:id', deleteTruck);


export default router;