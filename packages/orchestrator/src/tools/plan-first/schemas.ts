/**
 * Plan-First MCP Tools — Zod Schemas
 */
import { z } from 'zod';

export const ScientificDomain = z.enum([
  'fluid_dynamics', 'materials_science', 'molecular_dynamics',
  'quantum_chemistry', 'bioinformatics', 'astronomy',
  'earth_science', 'general',
]);

export const TaskType = z.enum([
  'paper_reproduction', 'new_method', 'data_analysis',
  'visualization', 'modeling', 'optimization', 'other',
]);

export const Complexity = z.enum(['simple', 'medium', 'complex']);
export const Approach = z.enum(['numerical_simulation', 'machine_learning', 'symbolic_computation', 'hybrid']);
export const EstimatedDuration = z.enum(['hours', 'days', 'weeks']);
export const Phase = z.enum(['Problem Analysis', 'Method Selection', 'Implementation', 'Validation']);

// classify_task
export const classifyTaskInput = z.object({
  task_description: z.string().describe("User's scientific task description"),
});

export const classifyTaskOutput = z.object({
  domain: ScientificDomain,
  task_type: TaskType,
  complexity: Complexity,
  approach: Approach,
  estimated_duration: EstimatedDuration,
  dependencies: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type ClassifyTaskInput = z.infer<typeof classifyTaskInput>;
export type ClassifyTaskOutput = z.infer<typeof classifyTaskOutput>;

// generate_plan
export const planStepTask = z.object({
  task: z.string(),
  description: z.string(),
  tools: z.array(z.string()),
  estimated_time: z.string(),
});

export const planPhase = z.object({
  phase: Phase,
  tasks: z.array(planStepTask),
});

export const generatePlanInput = z.object({
  task_description: z.string(),
  classification: z.record(z.string(), z.unknown()),
  constraints: z.array(z.string()).optional(),
});

export const generatePlanOutput = z.object({
  plan_id: z.string(),
  title: z.string(),
  classification: classifyTaskOutput,
  steps: z.array(planPhase),
  dependencies: z.array(z.string()),
  estimated_total_time: z.string(),
  risks: z.array(z.string()),
  success_criteria: z.array(z.string()),
});

export type GeneratePlanInput = z.infer<typeof generatePlanInput>;
export type GeneratePlanOutput = z.infer<typeof generatePlanOutput>;

// validate_plan
export const validatePlanInput = z.object({
  plan: z.record(z.string(), z.unknown()),
});

export const validatePlanOutput = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })),
  warnings: z.array(z.object({ field: z.string(), message: z.string() })),
  score: z.number().min(0).max(100),
});

export type ValidatePlanInput = z.infer<typeof validatePlanInput>;
export type ValidatePlanOutput = z.infer<typeof validatePlanOutput>;

// review_plan
export const reviewPlanInput = z.object({
  plan: z.record(z.string(), z.unknown()),
});

export const reviewPlanOutput = z.object({
  overall_score: z.number().min(0).max(10),
  method_rationality: z.object({ score: z.number().min(0).max(10), comments: z.array(z.string()) }),
  physical_constraints: z.object({ score: z.number().min(0).max(10), comments: z.array(z.string()) }),
  dimensional_consistency: z.object({ score: z.number().min(0).max(10), comments: z.array(z.string()) }),
  validation_criteria: z.object({ score: z.number().min(0).max(10), comments: z.array(z.string()) }),
  suggestions: z.array(z.string()),
});

export type ReviewPlanInput = z.infer<typeof reviewPlanInput>;
export type ReviewPlanOutput = z.infer<typeof reviewPlanOutput>;
