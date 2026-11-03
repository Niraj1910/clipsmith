import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { toVideoDto } from '../lib/dto.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { storage } from '../storage/index.js';
import { runFfprobe, validateVideoProbe } from '../lib/ffprobe.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Video } from '@clipper/shared/models';
import { LIMITS } from '@clipper/shared/constants';
import type { Paginated, VideoDto } from '@clipper/shared/dto';

export const videosRouter = Router();

// Ensure local temp storage directory exists
const tempDir = path.resolve(env.LOCAL_STORAGE_DIR, 'tmp');
fs.mkdir(tempDir, { recursive: true }).catch((err) => {
  console.error('Failed to create temp upload directory:', err);
});

const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: LIMITS.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.mp4' && ext !== '.mov' && ext !== '.webm') {
      return cb(
        new AppError(
          'UNSUPPORTED_MEDIA_TYPE',
          'Unsupported file extension. Allowed extensions are .mp4, .mov, and .webm'
        )
      );
    }
    cb(null, true);
  },
});

videosRouter.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', 'File is required in "file" field');
    }

    const tempPath = req.file.path;
    let fileMoved = false;

    try {
      const originalBasename = path.basename(req.file.originalname).slice(0, 255);
      const ext = path.extname(originalBasename).toLowerCase();

      // Double-check extension
      if (ext !== '.mp4' && ext !== '.mov' && ext !== '.webm') {
        throw new AppError(
          'UNSUPPORTED_MEDIA_TYPE',
          'Only .mp4, .mov, and .webm files are allowed'
        );
      }

      // Title validation if provided
      const rawTitle = req.body?.title;
      if (rawTitle && typeof rawTitle === 'string' && rawTitle.length > 200) {
        throw new AppError('VALIDATION_ERROR', 'Title cannot exceed 200 characters');
      }

      const defaultTitle = path.basename(originalBasename, ext).slice(0, 200) || 'Untitled';
      const title = (rawTitle && typeof rawTitle === 'string' && rawTitle.trim()) || defaultTitle;

      // Probe media format via child_process.spawn ffprobe (no shell)
      const probeResult = await runFfprobe(tempPath);
      const { durationSec, mimeType } = validateVideoProbe(probeResult, ext);

      // Move into storage: videos/<userId>/<uuid>.<ext>
      const fileUuid = crypto.randomUUID();
      const storageKey = `videos/${req.user!._id}/${fileUuid}${ext}`;

      await storage.put(tempPath, storageKey);
      fileMoved = true;

      const video = await Video.create({
        userId: req.user!._id,
        title,
        originalFilename: originalBasename,
        mimeType,
        sizeBytes: req.file.size,
        durationSec,
        storageKey,
        status: 'uploaded',
      });

      return res.status(201).json({
        video: toVideoDto(video),
      });
    } catch (err) {
      // Ensure no orphaned files in temp directory
      if (!fileMoved) {
        await fs.unlink(tempPath).catch(() => {});
      }
      throw err;
    }
  })
);

const listVideosValidation = validate({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

videosRouter.get(
  '/',
  requireAuth,
  listVideosValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user!._id };

    const [videos, total] = await Promise.all([
      Video.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Video.countDocuments(filter),
    ]);

    const response: Paginated<VideoDto> = {
      items: videos.map((v) => toVideoDto(v)),
      page,
      limit,
      total,
    };

    return res.status(200).json(response);
  })
);

videosRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('NOT_FOUND', 'Video not found');
    }

    // Isolation rule: videos belonging to another user must return 404, never 403
    const video = await Video.findOne({
      _id: id,
      userId: req.user!._id,
    });

    if (!video) {
      throw new AppError('NOT_FOUND', 'Video not found');
    }

    return res.status(200).json({
      video: toVideoDto(video),
      transcript: null,
      clips: [],
      latestJob: null,
    });
  })
);
