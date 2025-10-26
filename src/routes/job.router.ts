import { Router } from 'express';
import * as JobController from '../controllers/job.controller';

const router = Router();

router.post('/', JobController.createJob);
router.get('/', JobController.getJobs);
router.get('/:id', JobController.getJobById);
router.delete('/:id', JobController.deleteJob);
router.post('/mark-3-complete', JobController.completeTruckJobsAndFree);

export default router;
