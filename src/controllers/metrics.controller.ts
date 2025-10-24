import { Request, Response } from 'express';
import { getMetrics, getJobsTrend } from '../services/metrics.service';
import { metricsQuerySchema } from '../types/metrics';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHandler';

// =============================
// 📊 Get Dashboard Metrics
// =============================
export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    // Validate and parse query parameters
    const query = metricsQuerySchema.parse(req.query);
    
    // Convert string dates to proper format if provided
    const validatedQuery = {
      ...query,
      from: query.from ? new Date(query.from).toISOString() : undefined,
      to: query.to ? new Date(query.to).toISOString() : undefined,
    };

    const metrics = await getMetrics(validatedQuery);
    
    sendSuccessResponse(res, metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    sendErrorResponse(res, 'Failed to fetch dashboard metrics');
  }
};

// =============================
// 📈 Get Jobs Trend Data
// =============================
export const getJobsTrendData = async (req: Request, res: Response) => {
  try {
    // Validate and parse query parameters
    const query = metricsQuerySchema.parse(req.query);
    
    // Convert string dates to proper format if provided
    const validatedQuery = {
      ...query,
      from: query.from ? new Date(query.from).toISOString() : undefined,
      to: query.to ? new Date(query.to).toISOString() : undefined,
    };

    const trendData = await getJobsTrend(validatedQuery);
    
    sendSuccessResponse(res, trendData);
  } catch (error) {
    console.error('Error fetching jobs trend data:', error);
    sendErrorResponse(res, 'Failed to fetch jobs trend data');
  }
};