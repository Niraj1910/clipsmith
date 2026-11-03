import { Router, type Request, type Response } from 'express';
import { isMongoUp } from '../lib/db.js';
import { isRedisUp } from '../lib/redis.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const mongoUp = isMongoUp();
  const redisUp = await isRedisUp();

  return res.json({
    status: 'ok',
    mongo: mongoUp ? 'up' : 'down',
    redis: redisUp ? 'up' : 'down',
  });
});
