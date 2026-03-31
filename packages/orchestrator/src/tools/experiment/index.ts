export { expPlan } from './exp-plan.js';
export { expRun } from './exp-run.js';
export { expMonitor } from './exp-monitor.js';
export { expCompare } from './exp-compare.js';
export * from './schemas.js';
import { expPlan } from './exp-plan.js';
import { expRun } from './exp-run.js';
import { expMonitor } from './exp-monitor.js';
import { expCompare } from './exp-compare.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { ExpPlanInput, ExpRunInput, ExpMonitorInput, ExpCompareInput } from './schemas.js';

export const experimentTools: MCPToolDefinition<unknown, unknown>[] = [
  { name: 'exp_plan', description: 'Generate a structured experiment plan with phases, configs, and expected results', inputSchema: { type: 'object', properties: { task: { type: 'string' }, paper: { type: 'object' }, resources: { type: 'object', properties: { gpu: { type: 'string' }, cpu_cores: { type: 'number' }, ram_gb: { type: 'number' }, time_limit_hours: { type: 'number' } } } }, required: ['task'] }, handler: (i) => Promise.resolve(expPlan(i as ExpPlanInput)) },
  { name: 'exp_run', description: 'Generate a run script for an experiment plan', inputSchema: { type: 'object', properties: { experiment_plan: { type: 'object' }, config_overrides: { type: 'object' } }, required: ['experiment_plan'] }, handler: (i) => Promise.resolve(expRun(i as ExpRunInput)) },
  { name: 'exp_monitor', description: 'Monitor experiment progress from log file', inputSchema: { type: 'object', properties: { experiment_id: { type: 'string' }, log_file: { type: 'string' } }, required: ['experiment_id'] }, handler: (i) => Promise.resolve(expMonitor(i as ExpMonitorInput)) },
  { name: 'exp_compare', description: 'Compare multiple experiment results and find best configuration', inputSchema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { config: { type: 'object' }, metrics: { type: 'object' } } } } }, required: ['results'] }, handler: (i) => Promise.resolve(expCompare(i as ExpCompareInput)) },
];
