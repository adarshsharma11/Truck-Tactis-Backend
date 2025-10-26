import { Request, Response } from 'express';
import * as JobService from '../services/job.service';
import { jobSchema } from '../types/job';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseHandler';

// =============================
// ➕ Create Job
// =============================
export const createJob = async (req: Request, res: Response) => {
  try {
    const validated = jobSchema.parse(req.body);
    const job = await JobService.createJob(validated);
    return sendSuccessResponse(res, job, 201);
  } catch (err: any) {
    console.error('Error creating job:', err);
    return sendErrorResponse(res, err.message || 'Failed to create job');
  }
};

// =============================
// 📋 Get Jobs (List)
// =============================
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { page, limit, driverId, truckId, isCompleted } = req.query;
    const jobs = await JobService.listJobs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      driverId: driverId ? Number(driverId) : undefined,
      truckId: truckId ? Number(truckId) : undefined,
      isCompleted: isCompleted ? isCompleted === 'true' : undefined,
    });
    return sendSuccessResponse(res, jobs);
  } catch (err: any) {
    console.error('Error fetching jobs:', err);
    return sendErrorResponse(res, err.message || 'Failed to fetch jobs');
  }
};

// =============================
// 🔍 Get Job by ID
// =============================
export const getJobById = async (req: Request, res: Response) => {
  try {
    const job = await JobService.getJob(Number(req.params.id));
    if (!job) return sendErrorResponse(res, 'Job not found', 404);
    return sendSuccessResponse(res, job);
  } catch (err: any) {
    console.error('Error fetching job:', err);
    return sendErrorResponse(res, err.message || 'Failed to fetch job');
  }
};
// =============================
// 🔍 Delete Job by ID
// =============================

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const job = await JobService.deleteJob(Number(req.params.id));
    if (!job) return sendErrorResponse(res, 'Job not found', 404);
    return sendSuccessResponse(res, job);
  } catch (err: any) {
    console.error('Error deleting job:', err);
    return sendErrorResponse(res, err.message || 'Failed to delete job');
  }
};

export const  completeTruckJobsAndFree = async (req: Request, res: Response) => {
  try {
    const { truck_id } = req.body;
    await JobService.completeJob(Number(truck_id));
  } catch (error) {
    console.error('❌ Error completing jobs and freeing truck:', error);
    throw error;
  }
}
