import { z } from 'zod';
import { SERIAL_REQUIRED_PRODUCT_TYPES } from '@/lib/format';

/**
 * The university ID is sent to the backend exactly as typed (trimmed). No
 * format is enforced — the administrator can use whatever ID the university
 * issues — so the backend re-normalises regardless.
 */
export function normalizeUniversityIdInput(raw: string): string {
  return raw.trim();
}

const universityIdField = z
  .string()
  .trim()
  .min(1, 'University ID is required.')
  .max(60, 'University ID must be at most 60 characters.');

const passwordField = z
  .string()
  .min(6, 'Password must be at least 6 characters long.')
  .max(72, 'Password must be at most 72 characters long.')
  .regex(/\d/, 'Password must contain at least one number.');

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(120, 'Full name must be at most 120 characters.'),
    universityId: universityIdField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  universityId: universityIdField,
  password: z.string().min(1, 'Password is required.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .or(z.literal(''));

export const deviceSchema = z
  .object({
    productType: z.enum([
      'DESKTOP_COMPUTER',
      'LAPTOP',
      'MOBILE_PHONE',
      'TABLET',
      'OTHER',
    ]),
    productName: z
      .string()
      .trim()
      .min(1, 'Product name is required.')
      .max(120, 'Product name must be at most 120 characters.'),
    brand: optionalText(80, 'Brand'),
    model: optionalText(80, 'Model'),
    serialNumber: optionalText(120, 'Serial number'),
    description: optionalText(500, 'Description'),
  })
  .superRefine((data, ctx) => {
    if (
      SERIAL_REQUIRED_PRODUCT_TYPES.includes(data.productType) &&
      (!data.serialNumber || data.serialNumber.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serialNumber'],
        message:
          'Serial number is required for desktop computers, laptops, mobile phones and tablets.',
      });
    }
  });

export type DeviceFormValues = z.infer<typeof deviceSchema>;

export const rejectionReasonSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'Please give a reason of at least 3 characters.')
    .max(300, 'Reason must be at most 300 characters.'),
});

export type RejectionReasonFormValues = z.infer<typeof rejectionReasonSchema>;
