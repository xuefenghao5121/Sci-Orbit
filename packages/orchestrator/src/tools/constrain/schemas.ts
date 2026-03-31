import { z } from 'zod';

export const checkDimensionInput = z.object({
  equation: z.string(),
  variables: z.record(z.string(), z.string()).describe('Map of variable name to its dimension, e.g. {mass: "kg", velocity: "m/s"}'),
});
export const checkDimensionOutput = z.object({
  is_consistent: z.boolean(),
  analysis: z.string(),
  suggestions: z.array(z.string()),
});
export type CheckDimensionInput = z.infer<typeof checkDimensionInput>;
export type CheckDimensionOutput = z.infer<typeof checkDimensionOutput>;

export const checkConservationInput = z.object({
  simulation_results: z.array(z.record(z.string(), z.number())).describe('Array of timestep results'),
  law: z.enum(['mass', 'energy', 'momentum']),
  tolerance: z.number().default(0.01),
});
export const checkConservationOutput = z.object({
  is_conserved: z.boolean(),
  deviation: z.number(),
  plot_data: z.object({
    timesteps: z.array(z.number()),
    values: z.array(z.number()),
    label: z.string(),
  }),
});
export type CheckConservationInput = z.infer<typeof checkConservationInput>;
export type CheckConservationOutput = z.infer<typeof checkConservationOutput>;

export const checkRangeInput = z.object({
  values: z.array(z.number()),
  domain: z.enum(['fluid', 'material', 'chemistry']),
  property: z.string(),
});
export const checkRangeOutput = z.object({
  in_range: z.boolean(),
  warnings: z.array(z.string()),
  typical_ranges: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.string(),
    description: z.string(),
  }),
});
export type CheckRangeInput = z.infer<typeof checkRangeInput>;
export type CheckRangeOutput = z.infer<typeof checkRangeOutput>;

export const checkCodeInput = z.object({
  code: z.string(),
  language: z.enum(['python', 'c++']).default('python'),
  checks: z.array(z.enum(['precision', 'reproducibility', 'performance'])).default(['precision']),
});
export const checkCodeOutput = z.object({
  issues: z.array(z.object({ line: z.number(), severity: z.enum(['warning', 'error']), message: z.string() })),
  suggestions: z.array(z.string()),
  score: z.number().min(0).max(100),
});
export type CheckCodeInput = z.infer<typeof checkCodeInput>;
export type CheckCodeOutput = z.infer<typeof checkCodeOutput>;
