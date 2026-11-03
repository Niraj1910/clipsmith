import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { toUserDto } from '../lib/dto.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, COOKIE_NAME } from '../middleware/auth.js';
import { User, CreditLedger } from '@clipper/shared/models';
import { LIMITS } from '@clipper/shared/constants';

export const authRouter = Router();

// Constant cost factor 12 per specification
const BCRYPT_SALT_ROUNDS = 12;

// Fixed dummy hash for timing-attack safe comparison when email is not found
const DUMMY_HASH = '$2a$12$e8Y7N3kK6k31oJ9l8lH9CeP9YdC5f4rA1b2c3d4e5f6g7h8i9j0k';

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    maxAge: env.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function signUserToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role },
    env.JWT_SECRET,
    { expiresIn: `${env.JWT_EXPIRES_DAYS}d` }
  );
}

const signupValidation = validate({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password cannot exceed 72 characters'),
    name: z.string().max(100, 'Name cannot exceed 100 characters').optional(),
  }),
});

authRouter.post(
  '/signup',
  signupValidation,
  asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('CONFLICT', 'A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    email,
    passwordHash,
    name,
    credits: LIMITS.SIGNUP_CREDITS,
  });

  // Non-transactional ledger entry creation
  try {
    await CreditLedger.create({
      userId: user._id,
      delta: LIMITS.SIGNUP_CREDITS,
      reason: 'signup_grant',
      balanceAfter: LIMITS.SIGNUP_CREDITS,
    });
  } catch (ledgerError) {
    console.error('Failed to create credit ledger row on signup:', ledgerError);
  }

  const token = signUserToken(user._id.toString(), user.role);
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());

  return res.status(201).json({
    user: toUserDto(user),
  });
}));

const loginValidation = validate({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

authRouter.post(
  '/login',
  loginValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new AppError('UNAUTHENTICATED', 'Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('UNAUTHENTICATED', 'Invalid email or password');
    }

    const token = signUserToken(user._id.toString(), user.role);
    res.cookie(COOKIE_NAME, token, getAuthCookieOptions());

    return res.status(200).json({
      user: toUserDto(user),
    });
  })
);

authRouter.post('/logout', requireAuth, (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  return res.status(204).send();
});

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({
    user: toUserDto(req.user!),
  });
});

