import { describe, it } from 'vitest';
import { checkDimension } from '../dimension.js';
import { checkConservation } from '../conservation.js';
import { checkRange } from '../range.js';
import { checkCode } from '../code.js';

describe('constrain tools', () => {
  it('dimension check with missing vars', async () => {
    const result = await checkDimension({
      equation: 'E = m * c^2',
      variables: { E: 'J', m: 'kg' },
    });
    console.log('dimension:', JSON.stringify(result, null, 2));
  });

  it('dimension check consistent', async () => {
    const result = await checkDimension({
      equation: 'E = m * c^2',
      variables: { E: 'J', m: 'kg', c: 'm/s' },
    });
    console.log('dimension:', JSON.stringify(result, null, 2));
  });

  it('conservation check', async () => {
    const result = await checkConservation({
      simulation_results: [
        { time: 0, energy: 100 },
        { time: 1, energy: 100.001 },
        { time: 2, energy: 99.999 },
      ],
      law: 'energy',
      tolerance: 0.01,
    });
    console.log('conservation:', JSON.stringify(result, null, 2));
  });

  it('range check fluid density', async () => {
    const result = await checkRange({
      values: [998, 1000, 1005],
      domain: 'fluid',
      property: 'density',
    });
    console.log('range:', JSON.stringify(result, null, 2));
  });

  it('code check python', async () => {
    const result = await checkCode({
      code: `import random\nfor i in range(100):\n    x = random.random()\n    if x == 0.5:\n        pass`,
      language: 'python',
      checks: ['precision', 'reproducibility', 'performance'],
    });
    console.log('code check:', JSON.stringify(result, null, 2));
  });
});
