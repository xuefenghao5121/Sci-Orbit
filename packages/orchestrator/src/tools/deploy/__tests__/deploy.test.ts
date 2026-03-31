import { describe, it } from 'vitest';
import { inferStart } from '../start.js';
import { inferTest } from '../test.js';
import { inferStop } from '../stop.js';

describe('deploy tools', () => {
  it('start generates command', async () => {
    const result = await inferStart({
      model_path: '/tmp/model',
      engine: 'vllm',
    });
    console.log('start result:', JSON.stringify(result, null, 2));
  });

  it('test generates script', async () => {
    const result = await inferTest({
      service_url: 'http://localhost:8000',
      test_cases: [{ prompt: 'Hello' }],
    });
    console.log('test result keys:', Object.keys(result));
  });

  it('stop generates command', async () => {
    const result = await inferStop({ pid: '1234' });
    console.log('stop result:', JSON.stringify(result, null, 2));
  });
});
