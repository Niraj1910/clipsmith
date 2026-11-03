import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES, LIMITS } from '../constants.js';

export const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'creator',
    },
    credits: {
      type: Number,
      min: 0,
      default: LIMITS.SIGNUP_CREDITS,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value',
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Index justified: user lookup by email during authentication and enforcing unique email constraint
userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const User = model<User>('User', userSchema, 'users');
