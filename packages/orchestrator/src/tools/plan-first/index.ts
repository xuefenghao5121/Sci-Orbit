/**
 * Plan-First — MCP Tool Definitions & Exports
 */
export { classifyTask, classifyWithLLM, hasLLMConfig } from './classify-llm.js';
export { classifyRuleBased } from './classify.js';
export { generatePlan, generatePlanRuleBased, generatePlanWithLLM } from './generate.js';
export { validatePlan } from './validate.js';
export { reviewPlan, reviewPlanRuleBased, reviewPlanWithLLM } from './review.js';
export {
  classifyTaskInput, classifyTaskOutput,
  generatePlanInput, generatePlanOutput,
  validatePlanInput, validatePlanOutput,
  reviewPlanInput, reviewPlanOutput,
  type ClassifyTaskInput, type ClassifyTaskOutput,
  type GeneratePlanInput, type GeneratePlanOutput,
  type ValidatePlanInput, type ValidatePlanOutput,
  type ReviewPlanInput, type ReviewPlanOutput,
} from './schemas.js';

import { classifyTask } from './classify-llm.js';
import { generatePlan } from './generate.js';
import { validatePlan } from './validate.js';
import { reviewPlan } from './review.js';
import type { ClassifyTaskInput, GeneratePlanInput, ValidatePlanInput, ReviewPlanInput } from './schemas.js';

export interface MCPToolDefinition<TI, TO> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: TI) => Promise<TO>;
}

export const planFirstTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'classify_task',
    description: 'Classify a scientific task by domain, type, complexity, and recommend approach',
    inputSchema: { type: 'object', properties: { task_description: { type: 'string', description: "User's scientific task description" } }, required: ['task_description'] },
    handler: (input) => classifyTask(input as ClassifyTaskInput),
  },
  {
    name: 'generate_plan',
    description: 'Generate a structured analysis plan for a scientific task',
    inputSchema: { type: 'object', properties: { task_description: { type: 'string' }, classification: { type: 'object', description: 'Output from classify_task' }, constraints: { type: 'array', items: { type: 'string' } } }, required: ['task_description', 'classification'] },
    handler: (input) => generatePlan(input as GeneratePlanInput),
  },
  {
    name: 'validate_plan',
    description: 'Validate a plan for structural completeness',
    inputSchema: { type: 'object', properties: { plan: { type: 'object' } }, required: ['plan'] },
    handler: (input) => Promise.resolve(validatePlan(input as ValidatePlanInput)),
  },
  {
    name: 'review_plan',
    description: 'Scientifically review a plan for method rationality, physical constraints, dimensional consistency, and validation criteria',
    inputSchema: { type: 'object', properties: { plan: { type: 'object' } }, required: ['plan'] },
    handler: (input) => reviewPlan(input as ReviewPlanInput),
  },
];
