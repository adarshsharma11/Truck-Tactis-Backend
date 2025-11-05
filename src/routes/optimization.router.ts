import express from "express";
import { optimizeJobs, getOptimizedRoutes } from "../services/optimization.service";

const router = express.Router();

router.post("/optimize", async (req, res) => {
  try {
    const { jobDate } = req.body; 
    const result = await optimizeJobs(jobDate);
    res.json(result);
  } catch (err: any) {
    console.error("[OPTIMIZE] Failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/routes", async (req, res) => {
  try {
    const { decodePolyline , jobDate } = req.body;
    const result = await getOptimizedRoutes({ decodePolyline , jobDate});
    res.json(result);
  } catch (err: any) {
    console.error("[ROUTES] Failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
