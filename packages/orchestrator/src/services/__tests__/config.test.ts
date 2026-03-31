/**
 * Config service tests
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, afterAll } from 'vitest';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ai4s-test-'));
process.env.HOME = TEST_DIR;
fs.mkdirSync(path.join(TEST_DIR, '.claude', 'ai4s'), { recursive: true });

const { ConfigService, DEFAULT_CONFIG } = await import('../../services/config.js');

describe('ConfigService', () => {
  it('validates config correctly', () => {
    const svc = new ConfigService();
    expect(svc.validate()).toEqual([]);
  });

  it('detects invalid config', () => {
    const svc = new ConfigService();
    svc.update({ llm: { provider: 'custom', baseUrl: '' } });
    const errors = svc.validate();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('baseUrl');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
