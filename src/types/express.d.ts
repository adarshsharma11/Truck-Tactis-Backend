import { TloginRequest } from './general';

declare global {
  namespace Express {
    interface Request {
      user?: TloginRequest;
    }
  }
}
