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
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  placeName: z.string().max(200).nullable().optional(),
  caption: z.string().max(500).nullable().optional()
});

export const bulkUpdatePhotosSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  country: z.string().max(100).nullable(),
  city: z.string().max(100).nullable(),
  placeName: z.string().max(200).nullable().optional()
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(50)
});

export const photoTagSchema = z.object({
  tagName: z.string().trim().min(1).max(50)
});

export const uploadConstraints = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};
