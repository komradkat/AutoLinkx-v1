/**
 * Input validation for account flows (A-06).
 *
 * Bounded at the trust boundary: every field has a maximum length, so an
 * oversized submission is rejected before it reaches Auth or the database.
 * Field names match the contract, so `fieldErrors` keys are what Developer B
 * renders against.
 */
import 'server-only';
import { z } from 'zod';

import { PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from '@/contracts';

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address.'));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(72, 'Use at most 72 characters.');

export const registerSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter the name other people will see.')
    .max(PROFILE_LIMITS.displayNameMax, `Use at most ${PROFILE_LIMITS.displayNameMax} characters.`),
});

export const loginSchema = z.object({
  email,
  // Not length-checked: an existing password predates any rule change, and a
  // "too short" message on sign-in would leak that the account exists.
  password: z.string().min(1, 'Enter your password.').max(72),
});

export const recoveryRequestSchema = z.object({ email });

export const passwordUpdateSchema = z.object({ password });

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter the name other people will see.')
    .max(PROFILE_LIMITS.displayNameMax, `Use at most ${PROFILE_LIMITS.displayNameMax} characters.`),
  location: z
    .string()
    .trim()
    .max(PROFILE_LIMITS.locationMax, `Use at most ${PROFILE_LIMITS.locationMax} characters.`),
  contactEmail: z
    .string()
    .trim()
    .max(PROFILE_LIMITS.contactEmailMax)
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'Enter a valid email address, or leave it empty.',
    }),
  contactPhone: z
    .string()
    .trim()
    .max(PROFILE_LIMITS.contactPhoneMax, `Use at most ${PROFILE_LIMITS.contactPhoneMax} characters.`),
  publishContactEmail: z.boolean(),
  publishContactPhone: z.boolean(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
