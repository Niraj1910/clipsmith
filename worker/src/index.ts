import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Worker connected to MongoDB');

    const redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    await redis.ping();
    console.log('Worker connected to Redis');

    console.log('worker ready');

    // Keep process running until terminated
    const interval = setInterval(() => {}, 1000 * 60 * 60);

    const shutdown = async () => {
      clearInterval(interval);
      await redis.quit();
      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

bootstrap();
