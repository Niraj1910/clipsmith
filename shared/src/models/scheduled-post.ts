import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { PLATFORMS, POST_STATUS } from '../constants.js';

export const scheduledPostSchema = new Schema(
  {
    clipId: {
      type: Schema.Types.ObjectId,
      ref: 'Clip',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: PLATFORMS,
      required: true,
    },
    caption: {
      type: String,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: POST_STATUS,
      default: 'scheduled',
    },
    externalPostId: {
      type: String,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'scheduled_posts',
  }
);

// Indexes justified:
// 1) userId + scheduledAt: user view of scheduled posts in calendar order
// 2) status + scheduledAt: background worker finding pending scheduled posts that are due
scheduledPostSchema.index({ userId: 1, scheduledAt: 1 });
scheduledPostSchema.index({ status: 1, scheduledAt: 1 });

export type ScheduledPost = InferSchemaType<typeof scheduledPostSchema>;
export type ScheduledPostDocument = HydratedDocument<ScheduledPost>;
export const ScheduledPost = model<ScheduledPost>(
  'ScheduledPost',
  scheduledPostSchema,
  'scheduled_posts'
);
