import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors.js';
import type { ErrorBody } from '@clipper/shared/dto';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const body: ErrorBody = {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'File size exceeds maximum allowed limit',
        },
      };
      res.status(413).json(body);
      return;
    }

    const body: ErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    };
    res.status(400).json(body);
    return;
  }

  console.error('Unhandled internal server error:', err);
  const body: ErrorBody = {
    error: {
      code: 'INTERNAL',
      message: 'An unexpected internal error occurred',
    },
  };
  res.status(500).json(body);
}
