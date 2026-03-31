import { z } from 'zod';

export const expPlanInput = z.object({
  task: z.string(),
  paper: z.record(z.string(), z.unknown()).optional().describe('Parsed paper (optional)'),
  resources: z.object({
    gpu: z.string().optional(),
    cpu_cores: z.number().optional(),
    ram_gb: z.number().optional(),
    time_limit_hours: z.number().optional(),
  }).optional(),
});
export const expPhase = z.object({ name: z.string(), description: z.string(), steps: z.array(z.string()), estimated_time: z.string() });
export const expConfig = z.object({ key: z.string(), value: z.string(), description: z.string() });
export const expPlanOutput = z.object({
  experiment_id: z.string(),
  task: z.string(),
  phases: z.array(expPhase),
  configs: z.array(expConfig),
  expected_results: z.array(z.string()),
  resource_requirements: z.record(z.string(), z.unknown()),
});
export type ExpPlanInput = z.infer<typeof expPlanInput>;
export type ExpPlanOutput = z.infer<typeof expPlanOutput>;

export const expRunInput = z.object({
  experiment_plan: z.record(z.string(), z.unknown()),
  config_overrides: z.record(z.string(), z.string()).optional(),
});
export const expRunOutput = z.object({
  run_script: z.string(),
  log_file: z.string(),
  pid: z.number().optional(),
});
export type ExpRunInput = z.infer<typeof expRunInput>;
export type ExpRunOutput = z.infer<typeof expRunOutput>;

const ExpStatus = z.enum(['running', 'completed', 'failed', 'pending']);
export const expMonitorInput = z.object({
  experiment_id: z.string(),
  log_file: z.string().optional(),
});
export const expMonitorOutput = z.object({
  status: ExpStatus,
  metrics: z.record(z.string(), z.number()),
  current_epoch: z.number(),
  estimated_time_remaining: z.string(),
});
export type ExpMonitorInput = z.infer<typeof expMonitorInput>;
export type ExpMonitorOutput = z.infer<typeof expMonitorOutput>;

export const expCompareInput = z.object({
  results: z.array(z.object({
    config: z.record(z.string(), z.string()),
    metrics: z.record(z.string(), z.number()),
  })),
});
export const expCompareOutput = z.object({
  comparison_table: z.array(z.record(z.string(), z.string())),
  best_config: z.record(z.string(), z.string()),
  analysis: z.string(),
});
export type ExpCompareInput = z.infer<typeof expCompareInput>;
export type ExpCompareOutput = z.infer<typeof expCompareOutput>;
