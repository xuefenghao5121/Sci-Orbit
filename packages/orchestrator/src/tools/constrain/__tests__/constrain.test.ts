import { describe, it, expect } from 'vitest';
/**
 * Constraint tools unit tests
 */
import { checkDimension } from '../dimension.js';
import { checkConservation } from '../conservation.js';
import { checkRange } from '../range.js';
import { checkCode } from '../code.js';

describe('check_dimension', () => {
  it('should check with missing variable', async () => {
    const result = await checkDimension({
      equation: 'E = m * c^2',
      variables: { E: 'J', m: 'kg' },
    });
    expect(result).toBeDefined();
  });

  it('should check consistent dimensions', async () => {
    const result = await checkDimension({
      equation: 'E = m * c^2',
      variables: { E: 'J', m: 'kg', c: 'm/s' },
    });
    expect(result).toBeDefined();
  });
});

describe('check_conservation', () => {
  it('should check energy conservation', async () => {
    const result = await checkConservation({
      simulation_results: [
        { time: 0, energy: 100 },
        { time: 1, energy: 100.001 },
        { time: 2, energy: 99.999 },
      ],
      law: 'energy',
      tolerance: 0.01,
    });
    expect(result).toBeDefined();
  });
});

describe('check_range', () => {
  it('should check value ranges', async () => {
    const result = await checkRange({
      values: [998, 1000, 1005],
      domain: 'fluid',
      property: 'density',
    });
    expect(result).toBeDefined();
  });
});

describe('check_code', () => {
  it('should check code quality', async () => {
    const result = await checkCode({
      code: `import random\nfor i in range(100):\n    x = random.random()\n    if x == 0.5:\n        pass`,
      language: 'python',
      checks: ['precision', 'reproducibility', 'performance'],
    });
    expect(result).toBeDefined();
  });
});
