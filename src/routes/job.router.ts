import { Router } from 'express';
import * as JobController from '../controllers/job.controller';

const router = Router();

router.post('/', JobController.createJob);
router.get('/', JobController.getJobs);
router.get('/:id', JobController.getJobById);
router.delete('/:id', JobController.deleteJob);

export default router;
