import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.router';
import profileRouter from './routes/profile.router';
import truckRouter from './routes/truck.router';
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
const corsOptions = {
  origin: process.env.APP_ENV == 'developement' ? '*' : process.env.ORIGIN,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// JSON Middleware & Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// cookie parser middleware
app.use(cookieParser());

// Request Logger
app.use(requestLogger)

app.get('/', (req, res) => {
  res.status(200).send('🚛 Truck Tactics backend is live and database is connected.');
});


// Main Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/trucks', truckRouter);

// Not Found Middleware
app.use(notFoundHandler);

// Error Handling Middleware
app.use(errorHandler);

// app.listen(PORT, () => {
//   logger.info(`Listening on PORT ${PORT}`);
// });
