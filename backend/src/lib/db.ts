import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectDB(): Promise<typeof mongoose> {
  return mongoose.connect(env.MONGODB_URI);
}

export function isMongoUp(): boolean {
  return mongoose.connection.readyState === 1;
}
