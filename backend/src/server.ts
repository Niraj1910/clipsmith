import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './lib/db.js';
import { connectRedis } from './lib/redis.js';

async function bootstrap() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    await connectRedis();
    console.log('Connected to Redis');

    app.listen(env.PORT, () => {
      console.log(`Backend listening on port ${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  }
}

bootstrap();
