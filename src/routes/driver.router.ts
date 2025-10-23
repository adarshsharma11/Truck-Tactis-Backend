import { Router } from 'express';
import { addDriver, getDrivers, getDriver, updateDriver, deleteDriver } from '../controllers/driver.controller';

const router = Router();

router.post('/', addDriver);
router.get('/', getDrivers);
router.get('/:id', getDriver);
router.put('/:id', updateDriver);
router.delete('/:id', deleteDriver);

export default router;