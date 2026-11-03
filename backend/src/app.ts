import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { videosRouter } from './routes/videos.js';
import { errorHandler } from './middleware/error.js';

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Unchanged health check endpoint
app.use(healthRouter);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/videos', videosRouter);

// Error handler middleware
app.use(errorHandler);
