import { describe, it, expect } from 'vitest';
/**
 * Deploy tools unit tests
 */
import { inferStart } from '../start.js';
import { inferTest } from '../test.js';
import { inferStop } from '../stop.js';

describe('deploy tools', () => {
  it('start generates command', async () => {
    const result = await inferStart({
      model_path: '/tmp/model',
      engine: 'vllm',
    });
    expect(result).toBeDefined();
  });

  it('test generates script', async () => {
    const result = await inferTest({
      service_url: 'http://localhost:8000',
      test_cases: [{ prompt: 'Hello' }],
    });
    expect(result).toBeDefined();
  });

  it('stop generates command', async () => {
    const result = await inferStop({ pid: '1234' });
    expect(result).toBeDefined();
  });
});
