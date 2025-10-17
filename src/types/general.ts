import { User, Truck } from '@prisma/client';

// _____________  Truck Types  _____________

export type TTruckID = Truck['id'];
export type TTruckRead = Omit<Truck, 'createdAt' | 'updatedAt'>;
export type TTruckWrite = Omit<Truck, 'id' | 'createdAt' | 'updatedAt'>;

// _____________  User Types  _____________
export type TUserRegisterWrite = Omit<User, 'createdAt' | 'updatedAt'>;
export type TloginRead = Omit<User, 'createdAt' | 'updatedAt'>;
export type TloginRequest = Omit<User,'createdAt' | 'updatedAt' | 'password'>;
