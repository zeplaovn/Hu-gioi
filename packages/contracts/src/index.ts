import { z } from 'zod';

export const HealthResponse = z.object({
  ok: z.boolean(),
  service: z.string(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiError>;
