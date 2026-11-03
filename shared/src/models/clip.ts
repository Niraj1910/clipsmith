import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { CLIP_STATUS, LIMITS } from '../constants.js';

export const clipSchema = new Schema(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startSec: {
      type: Number,
      required: true,
    },
    endSec: {
      type: Number,
      required: true,
    },
    durationSec: {
      type: Number,
      required: true,
      min: [LIMITS.MIN_CLIP_SEC, `durationSec must be at least ${LIMITS.MIN_CLIP_SEC}s`],
      max: [LIMITS.MAX_CLIP_SEC, `durationSec cannot exceed ${LIMITS.MAX_CLIP_SEC}s`],
    },
    score: {
      type: Number,
      min: 0,
      max: 1,
    },
    signals: {
      type: Schema.Types.Mixed,
    },
    hookText: {
      type: String,
    },
    captionStyle: {
      type: String,
      default: 'default',
    },
    status: {
      type: String,
      enum: CLIP_STATUS,
      default: 'detected',
    },
    renderKey: {
      type: String,
    },
    thumbnailKey: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'clips',
  }
);

// Indexes justified:
// 1) userId + createdAt desc: fetching user's clips sorted newest first ("my clips" page)
// 2) videoId: fetching all clips generated from a specific source video
clipSchema.index({ userId: 1, createdAt: -1 });
clipSchema.index({ videoId: 1 });

export type Clip = InferSchemaType<typeof clipSchema>;
export type ClipDocument = HydratedDocument<Clip>;
export const Clip = model<Clip>('Clip', clipSchema, 'clips');
