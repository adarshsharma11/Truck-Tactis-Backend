import { Request, Response, NextFunction } from 'express';
import * as TruckService from '../services/truck.service';
import { truckSchema } from '../types/truck';
import {
  sendSuccessResponse,
  sendErrorResponse,
} from '../utils/responseHandler';

/**
 * @route   POST /api/trucks
 * @desc    Add a new truck
 */
export const addTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const truckRequest = truckSchema.parse(req.body);
    const truck = await TruckService.createTruck(truckRequest);
    return sendSuccessResponse(res, truck, 201);
  } catch (error: any) {
    console.error('Error adding truck:', error);
    return sendErrorResponse(res, error.message || 'Failed to add truck');
  }
};

/**
 * @route   GET /api/trucks
 * @desc    Get all trucks
 */
export const getTrucks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trucks = await TruckService.listTrucks();
    return sendSuccessResponse(res, trucks);
  } catch (error: any) {
    console.error('Error fetching trucks:', error);
    return sendErrorResponse(res, error.message || 'Failed to fetch trucks');
  }
};

export const deleteTruck = async (req: Request, res: Response) => {
  try {
    const truck = await TruckService.deleteTruck(Number(req.params.id));
    if (!truck) return sendErrorResponse(res, 'Truck not found', 404);
    return sendSuccessResponse(res, truck);
  } catch (err: any) {
    console.error('Error deleting job:', err);
    return sendErrorResponse(res, err.message || 'Failed to delete job');
  }
};