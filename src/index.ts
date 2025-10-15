import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.router';
import profileRouter from './routes/profile.router';
import itemRouter from './routes/item.router';
import truckRouter from './routes/truck.router';
import categoryRouter from './routes/category.router';
import jobRouter from './routes/job.router';
import optimizationRouter from './routes/optimization.router';

import { notFoundHandler } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import cookieParser from 'cookie-parser';
import requestLogger from './middleware/requestLogger';
import { pino } from "pino";

dotenv.config();

export const logger = pino({ name: "server start" });
// const PORT: number = parseInt(process.env.PORT as string, 10);

const app = express();

// CORS Middleware
app.use(
  cors({
    origin: "*", // ⚠️ Allow all origins
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: false, // disable cookies/auth for wildcard
  })
);
// JSON Middleware & Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser middleware
app.use(cookieParser());

// Request Logger
app.use(requestLogger)

// Main Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/trucks', truckRouter);
app.use('/api/items', itemRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/jobs', optimizationRouter);



// Not Found Middleware
app.use(notFoundHandler);

// Error Handling Middleware
app.use(errorHandler);

//const PORT = process.env.PORT || 6000;

// app.listen(PORT, () => {
//   logger.info(`Listening on PORT ${PORT}`);
// });

export default app;
