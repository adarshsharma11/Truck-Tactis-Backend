import { Request, Response, NextFunction } from 'express';
import * as TruckService from '../services/truck.service';
import { truckSchema, truckUpdateSchema } from '../types/truck';
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

/**
 * @route   PUT /api/trucks/:id
 * @desc    Update a truck
 */
export const updateTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const truckId = Number(req.params.id);
    if (!truckId || isNaN(truckId)) {
      return sendErrorResponse(res, 'Invalid truck ID', 400);
    }

    const truckUpdateData = truckUpdateSchema.parse(req.body);
    const updatedTruck = await TruckService.updateTruck(truckUpdateData, truckId);
    return sendSuccessResponse(res, updatedTruck);
  } catch (error: any) {
    console.error('Error updating truck:', error);
    return sendErrorResponse(res, error.message || 'Failed to update truck');
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