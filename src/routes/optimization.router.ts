import express from "express";
import { optimizeJobs, getOptimizedRoutes } from "../services/optimization.service";

const router = express.Router();

router.post("/optimize", async (_req, res) => {
  try {
    const result = await optimizeJobs();
    res.json(result);
  } catch (err: any) {
    console.error("[OPTIMIZE] Failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/routes", async (req, res) => {
  try {
    const { decodePolyline } = req.body;
    const result = await getOptimizedRoutes({ decodePolyline });
    res.json(result);
  } catch (err: any) {
    console.error("[ROUTES] Failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
