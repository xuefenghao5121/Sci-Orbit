/**
 * Environment tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { envDetect } from '../env/env-detect.js';
import { envSetup } from '../env/env-setup.js';

describe('env_detect', () => {
  it('should return environment info with os field', () => {
    const result = envDetect();
    expect(result.os).toBeTruthy();
    expect(result.cpu).toBeDefined();
    expect(typeof result.ram_gb).toBe('number');
    expect(result.gpu).toBeInstanceOf(Array);
  });
});

describe('env_setup', () => {
  it('should generate conda environment', () => {
    const result = envSetup({
      requirements: ['numpy>=1.20', 'torch>=2.0'],
      target: 'conda',
      name: 'test-env',
    });
    expect(result.setup_script).toBeTruthy();
    expect(result.environment_file).toBeTruthy();
  });

  it('should generate docker setup', () => {
    const result = envSetup({
      requirements: ['python>=3.10'],
      target: 'docker',
      name: 'test',
    });
    expect(result.setup_script).toBeTruthy();
  });
});
