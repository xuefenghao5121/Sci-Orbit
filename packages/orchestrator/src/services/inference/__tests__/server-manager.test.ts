import { describe, it, expect } from 'vitest';
import { ServerManager, ModelManager } from '../index.js';

describe('ServerManager', () => {
  it('should list servers (empty initially)', () => {
    const sm = new ServerManager();
    expect(sm.listServers()).toEqual([]);
  });

  it('should fail health check for non-existent server', async () => {
    const sm = new ServerManager();
    const result = await sm.healthCheck('http://127.0.0.1:19999');
    expect(result.healthy).toBe(false);
  });
});

describe('ModelManager', () => {
  it('should list local models', async () => {
    const mm = new ModelManager('/tmp/ai4s-test-models');
    const models = await mm.listLocalModels();
    expect(Array.isArray(models)).toBe(true);
  });
});
