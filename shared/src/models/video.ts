import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { VIDEO_STATUS } from '../constants.js';

export const videoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
    },
    originalFilename: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    sizeBytes: {
      type: Number,
    },
    durationSec: {
      type: Number,
    },
    storageKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: VIDEO_STATUS,
      default: 'uploaded',
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'videos',
  }
);

// Index justified: query user's videos ordered from newest to oldest
videoSchema.index({ userId: 1, createdAt: -1 });

export type Video = InferSchemaType<typeof videoSchema>;
export type VideoDocument = HydratedDocument<Video>;
export const Video = model<Video>('Video', videoSchema, 'videos');
