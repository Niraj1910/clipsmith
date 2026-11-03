import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/errors.js';

export interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schema: ValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error: any) {
      if (error && error.errors) {
        const message = error.errors[0]?.message || 'Validation failed';
        return next(new AppError('VALIDATION_ERROR', message, error.errors));
      }
      next(new AppError('VALIDATION_ERROR', error?.message || 'Validation failed'));
    }
  };
}
