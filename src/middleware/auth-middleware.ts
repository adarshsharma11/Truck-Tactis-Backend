import * as UserService from '../services/user.service';
import { NextFunction, Request, Response } from 'express';
import { sendBadRequestResponse } from '../utils/responseHandler';
import { verifyToken } from '../utils/jwtHandler';
import { TloginRequest } from '../types/general';


const protectAuth = async (request: Request, response: Response, next: NextFunction) => {
  const allCookies = request.cookies;
  const token = allCookies.jwt;
  if (token) {
    try {
      const decoded = verifyToken(token);
      const authUser = await UserService.getUserByID(decoded.id);
      if (authUser?.username) {
      (request as any).user = toLoginRequest(authUser);
      }
      next();
    } catch (error: any) {
      next(error);
    }
  } else {
    return sendBadRequestResponse(response, 'Unauthorized - you need to login');
  }
};

export { protectAuth };
function toLoginRequest(authUser: TloginRequest) {
  return {
    id: authUser.id,
    fullName: authUser.fullName,
    username: authUser.username,
    email: authUser.email
  };
}
