import { Router } from 'express';
import { getDashboardMetrics, getJobsTrendData } from '../controllers/metrics.controller';

const router = Router();

// =============================
// 📊 Metrics Routes
// =============================

// Get dashboard metrics
router.get('/dashboard', getDashboardMetrics);

// Get jobs trend data
router.get('/jobs-trend', getJobsTrendData);

export default router;