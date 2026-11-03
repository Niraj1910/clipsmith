import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { User, type UserDocument } from '@clipper/shared/models';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export const COOKIE_NAME = 'clipper_token';

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return next(new AppError('UNAUTHENTICATED', 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded || !decoded.sub) {
      return next(new AppError('UNAUTHENTICATED', 'Invalid authentication token'));
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return next(new AppError('UNAUTHENTICATED', 'User no longer exists'));
    }

    req.user = user;
    next();
  } catch {
    return next(new AppError('UNAUTHENTICATED', 'Invalid or expired authentication token'));
  }
}
