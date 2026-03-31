import { describe, it, expect } from 'vitest';
/**
 * LLM client service tests
 */
import { LLMClientService } from '../../services/llm-client.js';

describe('LLMClientService', () => {
  it('constructs without error', () => {
    const svc = new LLMClientService();
    expect(svc).toBeDefined();
  });

  it('rejects invalid requests gracefully', async () => {
    const svc = new LLMClientService();
    await expect(svc.complete([{ role: 'user', content: 'test' }], { timeout: 1000 })).rejects.toThrow();
  });
});
