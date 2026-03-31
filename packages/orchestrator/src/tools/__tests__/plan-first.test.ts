/**
 * Unit tests for Plan-First tools
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRuleBased } from '../plan-first/classify.js';
import { generatePlanRuleBased } from '../plan-first/generate.js';
import { validatePlan } from '../plan-first/validate.js';
import { reviewPlanRuleBased } from '../plan-first/review.js';
import {
  classifyTaskInput, classifyTaskOutput,
  validatePlanInput, validatePlanOutput,
  generatePlanInput, generatePlanOutput,
  reviewPlanInput, reviewPlanOutput,
} from '../plan-first/schemas.js';

// ─── classify_rule_based ────────────────────────────────────────────────────

describe('classifyRuleBased', () => {
  it('classifies CFD task', () => {
    const result = classifyRuleBased({ task_description: 'Simulate turbulent flow over airfoil using Navier-Stokes equations' });
    assert.equal(result.domain, 'fluid_dynamics');
    assert.equal(result.complexity, 'complex');
    assert.ok(result.confidence >= 0.5);
  });

  it('classifies molecular dynamics', () => {
    const result = classifyRuleBased({ task_description: 'Run MD simulation of protein folding with GROMACS' });
    assert.equal(result.domain, 'molecular_dynamics');
    assert.ok(result.dependencies.some(d => d.includes('MDAnalysis')));
  });

  it('classifies visualization', () => {
    const result = classifyRuleBased({ task_description: 'Create interactive matplotlib plot for experiment results' });
    assert.equal(result.task_type, 'visualization');
    assert.equal(result.complexity, 'simple');
  });

  it('falls back to general for unknown task', () => {
    const result = classifyRuleBased({ task_description: 'something random with no keywords' });
    assert.equal(result.domain, 'general');
    assert.equal(result.confidence, 0.3);
  });

  it('schema validation passes', () => {
    const input = classifyTaskInput.parse({ task_description: 'test' });
    assert.equal(input.task_description, 'test');
  });
});

// ─── generate_plan ──────────────────────────────────────────────────────────

describe('generatePlanRuleBased', () => {
  it('generates plan with all 4 phases', () => {
    const plan = generatePlanRuleBased({
      task_description: 'CFD simulation of pipe flow',
      classification: { domain: 'fluid_dynamics', task_type: 'modeling', complexity: 'complex', approach: 'numerical_simulation', estimated_duration: 'weeks', dependencies: ['numpy'], confidence: 0.8, reasoning: 'test' },
    });
    assert.ok(plan.plan_id.startsWith('plan_'));
    assert.equal(plan.steps.length, 4);
    assert.ok(plan.steps.some(s => s.phase === 'Problem Analysis'));
    assert.ok(plan.risks.length > 0);
    assert.ok(plan.success_criteria.length > 0);
  });

  it('applies constraints', () => {
    const plan = generatePlanRuleBased({
      task_description: 'test',
      classification: { domain: 'general', task_type: 'data_analysis', complexity: 'simple', approach: 'hybrid', estimated_duration: 'hours', dependencies: [], confidence: 0.5, reasoning: 'test' },
      constraints: ['Must use Python 3.11', 'Budget < 100 lines'],
    });
    const lastPhase = plan.steps[plan.steps.length - 1];
    assert.ok(lastPhase.tasks.some(t => t.task.includes('constraints')));
  });

  it('schema validation', () => {
    const cls = { domain: 'general', task_type: 'data_analysis', complexity: 'simple', approach: 'hybrid', estimated_duration: 'hours', dependencies: [], confidence: 0.5, reasoning: 'test' };
    const input = generatePlanInput.parse({ task_description: 'test', classification: cls });
    assert.equal(input.task_description, 'test');
  });
});

// ─── validate_plan ──────────────────────────────────────────────────────────

describe('validatePlan', () => {
  it('rejects empty plan', () => {
    const result = validatePlan({ plan: {} });
    assert.equal(result.valid, false);
    assert.ok(result.score < 50);
    assert.ok(result.errors.length > 0);
  });

  it('passes valid plan', () => {
    const plan = {
      plan_id: 'plan_test',
      title: 'Test',
      classification: { domain: 'general', task_type: 'data_analysis', complexity: 'simple', approach: 'hybrid' },
      steps: [{ phase: 'Problem Analysis', tasks: [{ task: 't', description: 'd', tools: [], estimated_time: '1h' }] }],
      dependencies: ['numpy'],
      success_criteria: ['works'],
    };
    const result = validatePlan({ plan });
    assert.equal(result.valid, true);
    assert.ok(result.score > 80);
  });

  it('warns about missing phases', () => {
    const plan = {
      plan_id: 'plan_test', title: 'T',
      classification: {},
      steps: [{ phase: 'Problem Analysis', tasks: [{ task: 't', description: 'd', tools: [], estimated_time: '1h' }] }],
      dependencies: [],
      success_criteria: [],
    };
    const result = validatePlan({ plan });
    assert.ok(result.warnings.some(w => w.message.includes('Missing recommended phase')));
  });
});

// ─── review_plan ────────────────────────────────────────────────────────────

describe('reviewPlanRuleBased', () => {
  it('reviews fluid dynamics plan', () => {
    const plan = {
      plan_id: 'plan_test', title: 'CFD',
      classification: { domain: 'fluid_dynamics', complexity: 'complex', approach: 'numerical_simulation' },
      steps: [{ phase: 'Problem Analysis', tasks: [{ task: 'define equations', description: 'd', tools: [], estimated_time: '1h' }] }],
      success_criteria: ['match benchmark'],
    };
    const result = reviewPlanRuleBased({ plan });
    assert.ok(result.overall_score >= 0);
    assert.ok(result.overall_score <= 10);
    assert.ok(result.suggestions.length > 0);
  });

  it('flags ML for quantum domain', () => {
    const plan = {
      plan_id: 'plan_test', title: 'QC',
      classification: { domain: 'quantum_chemistry', complexity: 'complex', approach: 'machine_learning' },
      steps: [],
      success_criteria: ['accuracy > 0.9'],
    };
    const result = reviewPlanRuleBased({ plan });
    assert.ok(result.method_rationality.comments.some(c => c.includes('interpretability')));
  });
});
