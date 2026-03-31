/**
 * Experiment tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { expPlan } from '../experiment/exp-plan.js';
import { expRun } from '../experiment/exp-run.js';
import { expMonitor } from '../experiment/exp-monitor.js';
import { expCompare } from '../experiment/exp-compare.js';

describe('exp_plan', () => {
  it('should generate experiment plan with phases', () => {
    const result = expPlan({ task: 'Test fluid simulation' });
    expect(result.experiment_id).toMatch(/^exp_/);
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.phases[0].name).toBeTruthy();
    expect(result.phases[0].steps).toBeInstanceOf(Array);
  });
});

describe('exp_run', () => {
  it('should generate run script', () => {
    const plan = expPlan({ task: 'test' });
    const result = expRun({ experiment_plan: plan as any });
    expect(result.run_script).toBeTruthy();
  });
});

describe('exp_monitor', () => {
  it('should return experiment status', () => {
    const result = expMonitor({ experiment_id: 'exp_test' });
    expect(result.status).toBeDefined();
    expect(result.current_epoch).toBeDefined();
  });
});

describe('exp_compare', () => {
  it('should compare experiment results', () => {
    const results = [
      { config: { lr: '0.01' }, metrics: { accuracy: 0.9, loss: 0.1 } },
      { config: { lr: '0.001' }, metrics: { accuracy: 0.85, loss: 0.15 } },
    ];
    const result = expCompare({ results });
    expect(result.best_config).toBeDefined();
    expect(result.comparison_table).toBeDefined();
  });
});
