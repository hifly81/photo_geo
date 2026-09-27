import { z } from 'zod';

export const photoFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  country: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  tag: z.string().min(1).optional()
});

export const updatePhotoSchema = z.object({
  takenAt: z.string().datetime().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  caption: z.string().nullable().optional()
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(50)
});

export const photoTagSchema = z.object({
  tagName: z.string().trim().min(1).max(50)
});
