import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { JOB_TYPE, JOB_STATUS } from '../constants.js';

const jobErrorSchema = new Schema(
  {
    code: { type: String },
    message: { type: String },
  },
  { _id: false }
);

export const jobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: JOB_TYPE,
      required: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    clipId: {
      type: Schema.Types.ObjectId,
      ref: 'Clip',
    },
    status: {
      type: String,
      enum: JOB_STATUS,
      default: 'queued',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    bullJobId: {
      type: String,
    },
    creditsReserved: {
      type: Number,
      default: 0,
    },
    error: jobErrorSchema,
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'jobs',
  }
);

// Indexes justified:
// 1) userId + createdAt desc: list user's jobs chronologically
// 2) videoId: find all processing jobs attached to a video
// 3) status: worker polling or queue monitoring for active/queued/failed jobs
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ videoId: 1 });
jobSchema.index({ status: 1 });

export type Job = InferSchemaType<typeof jobSchema>;
export type JobDocument = HydratedDocument<Job>;
export const Job = model<Job>('Job', jobSchema, 'jobs');
