import { Request, Response, NextFunction } from 'express';
import * as DriverService from '../services/driver.service';
import { driverSchema } from '../types/driver';
import {
  sendSuccessResponse,
  sendErrorResponse,
} from '../utils/responseHandler';

/**
 * @route   POST /api/drivers
 * @desc    Add a new driver
 */
export const addDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverRequest = driverSchema.parse(req.body);
    const driver = await DriverService.createDriver(driverRequest);
    return sendSuccessResponse(res, driver, 201);
  } catch (error: any) {
    console.error('Error adding driver:', error);
    return sendErrorResponse(res, error.message || 'Failed to add driver');
  }
};

/**
 * @route   GET /api/drivers
 * @desc    Get all drivers
 */
export const getDrivers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drivers = await DriverService.listDrivers();
    return sendSuccessResponse(res, drivers);
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return sendErrorResponse(res, error.message || 'Failed to fetch drivers');
  }
};

/**
 * @route   GET /api/drivers/:id
 * @desc    Get driver by ID
 */
export const getDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = Number(req.params.id);
    const driver = await DriverService.getDriver(driverId);
    
    if (!driver) {
      return sendErrorResponse(res, 'Driver not found', 404);
    }
    
    return sendSuccessResponse(res, driver);
  } catch (error: any) {
    console.error('Error fetching driver:', error);
    return sendErrorResponse(res, error.message || 'Failed to fetch driver');
  }
};

/**
 * @route   PUT /api/drivers/:id
 * @desc    Update driver
 */
export const updateDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = Number(req.params.id);
    const driverRequest = driverSchema.partial().parse(req.body);
    const driver = await DriverService.updateDriver(driverRequest, driverId);
    return sendSuccessResponse(res, driver);
  } catch (error: any) {
    console.error('Error updating driver:', error);
    return sendErrorResponse(res, error.message || 'Failed to update driver');
  }
};

/**
 * @route   DELETE /api/drivers/:id
 * @desc    Delete driver
 */
export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const driver = await DriverService.deleteDriver(Number(req.params.id));
    if (!driver) return sendErrorResponse(res, 'Driver not found', 404);
    return sendSuccessResponse(res, driver);
  } catch (err: any) {
    console.error('Error deleting driver:', err);
    return sendErrorResponse(res, err.message || 'Failed to delete driver');
  }
};