/**
 * validate_plan — structural completeness check
 */
import type { ValidatePlanInput, ValidatePlanOutput } from './schemas.js';
import { validatePlanOutput } from './schemas.js';

export function validatePlan(input: ValidatePlanInput): ValidatePlanOutput {
  const plan = input.plan as Record<string, unknown>;
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  for (const field of ['plan_id', 'title', 'classification', 'steps', 'dependencies', 'success_criteria'] as const) {
    if (!plan[field]) errors.push({ field, message: `Missing required field: ${field}` });
  }

  const steps = plan.steps as unknown[];
  if (Array.isArray(steps) && steps.length > 0) {
    const phases = new Set<string>();
    for (const step of steps) {
      const s = step as Record<string, unknown>;
      if (!s.phase) errors.push({ field: 'steps[].phase', message: 'Step missing phase' });
      else phases.add(String(s.phase));
      if (!Array.isArray(s.tasks)) errors.push({ field: 'steps[].tasks', message: 'Step missing tasks array' });
    }
    for (const p of ['Problem Analysis', 'Method Selection', 'Implementation', 'Validation']) {
      if (!phases.has(p)) warnings.push({ field: 'steps', message: `Missing recommended phase: ${p}` });
    }
  } else if (steps) {
    errors.push({ field: 'steps', message: 'Steps must be a non-empty array' });
  }

  const cls = plan.classification as Record<string, unknown> | undefined;
  if (cls) {
    for (const field of ['domain', 'task_type', 'complexity', 'approach'] as const) {
      if (!cls[field]) warnings.push({ field: `classification.${field}`, message: `Classification missing ${field}` });
    }
  }

  const deps = plan.dependencies as unknown[];
  if (Array.isArray(deps)) {
    for (const d of deps) { if (typeof d !== 'string') { errors.push({ field: 'dependencies', message: 'Each dependency must be a string' }); break; } }
  }

  const criteria = plan.success_criteria as unknown[];
  if (Array.isArray(criteria) && criteria.length === 0) warnings.push({ field: 'success_criteria', message: 'Consider adding specific success criteria' });

  return validatePlanOutput.parse({ valid: errors.length === 0, errors, warnings, score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5) });
}
