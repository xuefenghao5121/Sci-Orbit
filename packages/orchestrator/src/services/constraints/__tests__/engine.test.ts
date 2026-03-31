import { describe, it, expect } from 'vitest';
import { ConstraintEngine } from '../index.js';
import { runNumericalChecks } from '../rules/numerical-rules.js';
import { checkChemicalBalance } from '../rules/chemistry-rules.js';
import { runAllCodeChecks } from '../rules/code-rules.js';

describe('ConstraintEngine', () => {
  const engine = new ConstraintEngine();

  it('should check dimension consistency', () => {
    const result = engine.checkDimension('F = m * a', { F: 'MLT⁻²', m: 'M', a: 'LT⁻²' });
    expect(result.passed).toBe(true);
  });

  it('should detect dimension mismatch', () => {
    const result = engine.checkDimension('E = m', { E: 'ML²T⁻²', m: 'M' });
    expect(result.passed).toBe(false);
  });

  it('should check conservation', () => {
    const data = [100, 100, 100, 100, 100];
    const result = engine.checkConservation(data, 'energy');
    expect(result.passed).toBe(true);
  });

  it('should detect conservation violation', () => {
    const data = [100, 95, 80, 50, 10];
    const result = engine.checkConservation(data, 'energy');
    expect(result.passed).toBe(false);
  });

  it('should check range', () => {
    const result = engine.checkRange([1, 2, 3, 10, 5], { min: 0, max: 5 });
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
  });

  it('should check code', () => {
    const result = engine.checkCode('x = eval(input())', ['no-eval']);
    expect(result.passed).toBe(false);
    expect(result.issues[0].rule).toBe('no-eval');
  });

  it('should run all checks', () => {
    const report = engine.runAllChecks({
      equation: 'F = m * a',
      variables: { F: 'MLT⁻²', m: 'M', a: 'LT⁻²' },
      data: [100, 100, 100],
      law: 'energy',
      values: [1, 2, 3],
      domain: { min: 0, max: 10 },
      code: 'x = 1',
    });
    expect(report.summary.total).toBeGreaterThan(0);
  });
});

describe('NumericalRules', () => {
  it('should detect NaN', () => {
    const result = runNumericalChecks([1, NaN, 3]);
    expect(result.passed).toBe(false);
  });

  it('should check convergence', () => {
    const values = [10, 5, 2.5, 1.25, 0.625, 0.3125, 0.15625];
    // Not converged yet
    const result = runNumericalChecks(values);
    expect(result.checks.some(c => c.name === 'convergence')).toBe(true);
  });
});

describe('ChemistryRules', () => {
  it('should check chemical balance', () => {
    // Simple: 2H + O = H2O (simplified)
    const result = checkChemicalBalance('2H + O -> H2O');
    expect(typeof result.balanced).toBe('boolean');
    expect(result.elements).toBeDefined();
  });
});

describe('CodeRules', () => {
  it('should detect eval', () => {
    const result = runAllCodeChecks('x = eval(input())');
    expect(result.passed).toBe(false);
  });

  it('should detect bare except', () => {
    const result = runAllCodeChecks('try:\n  pass\nexcept:\n  pass');
    expect(result.issues.some(i => i.rule === 'bare-except')).toBe(true);
  });
});
