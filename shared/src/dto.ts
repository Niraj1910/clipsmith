import type { Role, VideoStatus } from './constants.js';

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  role: Role;
  credits: number;
  createdAt: string;
}

export interface VideoDto {
  id: string;
  title?: string;
  originalFilename?: string;
  sizeBytes?: number;
  durationSec?: number;
  status: VideoStatus;
  failureReason?: string;
  createdAt: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INSUFFICIENT_CREDITS'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
