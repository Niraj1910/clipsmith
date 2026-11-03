export const ROLES = ['creator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const VIDEO_STATUS = [
  'uploaded',
  'transcribing',
  'transcribed',
  'detecting',
  'ready',
  'failed',
] as const;
export type VideoStatus = (typeof VIDEO_STATUS)[number];

export const CLIP_STATUS = [
  'detected',
  'rendering',
  'ready',
  'failed',
] as const;
export type ClipStatus = (typeof CLIP_STATUS)[number];

export const JOB_TYPE = ['transcribe', 'detect', 'render'] as const;
export type JobType = (typeof JOB_TYPE)[number];

export const JOB_STATUS = ['queued', 'running', 'succeeded', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

export const POST_STATUS = [
  'scheduled',
  'published',
  'cancelled',
  'failed',
] as const;
export type PostStatus = (typeof POST_STATUS)[number];

export const PLATFORMS = [
  'tiktok',
  'instagram',
  'facebook',
  'x',
  'linkedin',
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const LEDGER_REASON = [
  'signup_grant',
  'reserve',
  'refund',
  'admin_adjust',
] as const;
export type LedgerReason = (typeof LEDGER_REASON)[number];

export const TRANSCRIPTION_PROVIDERS = ['mock', 'groq', 'openai'] as const;
export type TranscriptionProvider = (typeof TRANSCRIPTION_PROVIDERS)[number];

export const LIMITS = {
  MAX_UPLOAD_BYTES: 2 * 1024 ** 3,
  MAX_VIDEO_MINUTES: 60,
  MIN_CLIP_SEC: 5,
  MAX_CLIP_SEC: 120,
  SIGNUP_CREDITS: 30,
} as const;
