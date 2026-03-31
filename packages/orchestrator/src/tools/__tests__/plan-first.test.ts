import { describe, it, expect } from 'vitest';
/**
 * Plan-First tools unit tests
 */
import { classifyRuleBased } from '../plan-first/classify.js';
import { generatePlanRuleBased } from '../plan-first/generate.js';
import { validatePlan } from '../plan-first/validate.js';
import { reviewPlanRuleBased } from '../plan-first/review.js';

describe('classify_rule_based', () => {
  it('should classify CFD tasks', () => {
    const result = classifyRuleBased({ task_description: 'Run CFD simulation with OpenFOAM for turbulence analysis' });
    expect(result.domain).toBe('fluid_dynamics');
    expect(result.task_type).toBe('modeling');
  });

  it('should classify ML tasks', () => {
    const result = classifyRuleBased({ task_description: 'Train a neural network for image classification' });
    expect(result.approach).toBe('machine_learning');
  });

  it('should classify reproduction tasks', () => {
    const result = classifyRuleBased({ task_description: 'Reproduce the results from the paper on GNN' });
    expect(result.task_type).toBe('paper_reproduction');
  });
});

describe('generate_plan_rule_based', () => {
  it('should generate plan with phases', () => {
    const result = generatePlanRuleBased({
      task_description: 'CFD simulation',
      classification: classifyRuleBased({ task_description: 'CFD' }),
    });
    expect(result.plan_id).toMatch(/^plan_/);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('validate_plan', () => {
  it('should validate a valid plan', () => {
    const result = validatePlan({
      plan: { plan_id: 'p1', phases: [{ phase: 'Problem Analysis', tasks: [{ task: 'Define problem', description: 'desc', tools: [], estimated_time: '1h' }] }], dependencies: [], estimated_duration: 'days' },
    });
    expect(result.valid).toBeDefined();
    expect(result.errors).toBeInstanceOf(Array);
  });
});

describe('review_plan_rule_based', () => {
  it('should review and score plan', () => {
    const result = reviewPlanRuleBased({
      plan: { plan_id: 'p1', phases: [{ phase: 'Implementation', tasks: [{ task: 'Build solver', description: 'Implement FD solver', tools: ['numpy'], estimated_time: '2d' }] }], dependencies: ['numpy'], estimated_duration: 'days' },
      task_description: 'Build a CFD solver',
    });
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(10);
    expect(result.suggestions).toBeInstanceOf(Array);
  });
});
