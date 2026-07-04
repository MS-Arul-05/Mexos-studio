import { z } from 'zod';

/**
 * E.164 mobile number: leading '+', country code, 8–15 total digits
 * (03_DESIGN.md §6 — E.164-style, country code required).
 */
const mobileNumber = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'mobileNumber must be E.164 format, e.g. +919876543210');

export const sendOtpSchema = z.object({
  mobileNumber,
});

export const verifyOtpSchema = z.object({
  mobileNumber,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'otp must be 6 digits'),
  // First-time users can pass a name to capture at account creation (Task C).
  name: z.string().trim().min(1).max(80).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1, 'refreshToken is required'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
