import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { LEDGER_REASON } from '../constants.js';

export const creditLedgerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    delta: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer',
      },
    },
    reason: {
      type: String,
      enum: LEDGER_REASON,
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'credit_ledgers',
  }
);

// Index justified: query user's credit history / ledger entries newest first
creditLedgerSchema.index({ userId: 1, createdAt: -1 });

export type CreditLedger = InferSchemaType<typeof creditLedgerSchema>;
export type CreditLedgerDocument = HydratedDocument<CreditLedger>;
export const CreditLedger = model<CreditLedger>(
  'CreditLedger',
  creditLedgerSchema,
  'credit_ledgers'
);
