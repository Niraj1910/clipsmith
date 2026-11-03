import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { TRANSCRIPTION_PROVIDERS } from '../constants.js';

const segmentSchema = new Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const wordSchema = new Schema(
  {
    word: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false }
);

export const transcriptSchema = new Schema(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    provider: {
      type: String,
      enum: TRANSCRIPTION_PROVIDERS,
    },
    language: {
      type: String,
    },
    fullText: {
      type: String,
    },
    segments: [segmentSchema],
    words: [wordSchema],
  },
  {
    timestamps: true,
    collection: 'transcripts',
  }
);

// Index justified: lookup transcript by videoId with unique 1-to-1 constraint
transcriptSchema.index({ videoId: 1 }, { unique: true });

export type Transcript = InferSchemaType<typeof transcriptSchema>;
export type TranscriptDocument = HydratedDocument<Transcript>;
export const Transcript = model<Transcript>(
  'Transcript',
  transcriptSchema,
  'transcripts'
);
